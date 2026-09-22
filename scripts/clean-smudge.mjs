/**
 * 지운 글자 자국을 지운다.
 *
 *   node scripts/clean-smudge.mjs           — 무엇이 더러운지만 알려준다
 *   node scripts/clean-smudge.mjs --write   — 실제로 고친다
 *
 * 몇몇 에셋 안쪽에 **옅은 회색 얼룩**이 남아 있다. 생성할 때 글자를 넣었다가
 * 지운 자국이다. 화면에서는 등급 도장 안이나 달력 한가운데가 지저분해 보인다.
 *
 * 구분 기준은 색기(色氣)다. 우리 팔레트의 연회색 #E8EBF0 은 파란 기가 있어
 * 파랑 채널이 빨강보다 높다. 얼룩은 완전한 무채색이라 세 채널이 거의 같다.
 * 밝고 · 무채색이고 · 순백이 아닌 픽셀만 순백으로 민다.
 */
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../public/assets");
const WRITE = process.argv.includes("--write");

/**
 * 고칠 파일을 **손으로 적는다.**
 *
 * 밝고 무채색인 자리를 전부 밀면 회색 후드나 밤하늘 같은 멀쩡한 그림까지 망가진다.
 * 얼룩은 눈으로 확인한 것만 고친다. 새 에셋을 받으면 컨택트시트를 보고 여기에 더한다.
 */
const TARGETS = [
  "item/grade-1.png",
  "item/grade-2.png",
  "item/grade-3.png",
  "item/grade-4.png",
  "item/grade-5.png",
  "item/item-calendar.png",
  "item/item-clipboard.png",
];

/*
  여기 적힌 파일들은 남색 외곽선과 흰 면, 그리고 파랑·노랑 강조뿐이다.
  **무채색 회색 자체가 있으면 안 되는 그림들**이라 과감하게 민다.
  색기가 조금이라도 있으면(파랑·노랑) 건드리지 않으므로 강조색은 남는다.
*/
/** 채널 차이가 이 아래면 무채색 — 우리 팔레트에 없는 색이다 */
const NEUTRAL = 22;
/** 이 위는 이미 순백이라 건드리지 않는다 */
const ALREADY_WHITE = 252;

async function scrub(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let touched = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue; // 투명한 자리
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const lo = Math.min(r, g, b);
    const hi = Math.max(r, g, b);
    if (hi - lo > NEUTRAL) continue; // 색기가 있으면 우리 팔레트
    if (lo >= ALREADY_WHITE) continue; // 이미 순백
    data[i] = data[i + 1] = data[i + 2] = 255;
    touched += 1;
  }

  if (touched === 0) return 0;
  if (WRITE) {
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(file);
  }
  return touched;
}

const dirty = [];
for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  const touched = await scrub(file);
  if (touched > 0) dirty.push({ name: rel, touched });
}

dirty.sort((a, b) => b.touched - a.touched);
if (dirty.length === 0) {
  console.log("얼룩 없음");
} else {
  console.log(`${WRITE ? "고침" : "얼룩 있음"} ${dirty.length}개`);
  for (const d of dirty) console.log(`  ${d.name.padEnd(28)} ${d.touched}픽셀`);
  if (!WRITE) console.log("\n실제로 고치려면 --write 를 붙인다");
}
