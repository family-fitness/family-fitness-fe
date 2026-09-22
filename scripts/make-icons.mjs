/**
 * 홈 화면에 놓일 아이콘을 만든다.
 *
 *   node scripts/make-icons.mjs
 *
 * 바탕은 흰색이 아니라 연한 파랑이다. 캐릭터의 흰 옷이 흰 바탕에 묻혀
 * 48px 로 줄어들면 머리와 신발만 남는다. 앱 서랍에서 옆 아이콘과 구분되려면
 * 색 덩어리가 있어야 한다.
 *
 * maskable 은 기기가 원·사각 무엇으로든 잘라 내므로 가장자리를 비워 둔다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
/*
  1차 move/ 그림들은 머리카락이 없어서 아이콘으로 쓸 수 없다.
  머리가 그려진 anim/ 쪽을 쓴다.
*/
const SOURCE = path.join(ROOT, "public/assets/anim/pose-cheer.png");
const OUT = path.join(ROOT, "public");
/** Next 가 파일 이름만 보고 <link> 를 만들어 주는 자리 */
const APP = path.join(ROOT, "src/app");

/** --color-signal-soft. 화면 안에서도 쓰는 연한 파랑이다 */
const GROUND = { r: 234, g: 243, b: 253, alpha: 1 };

/** 한 변 size, 그림이 차지하는 비율 fill */
async function icon(size, fill, file, dir = OUT) {
  const inner = Math.round(size * fill);
  const art = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const offset = Math.round((size - inner) / 2);

  await sharp({ create: { width: size, height: size, channels: 4, background: GROUND } })
    .composite([{ input: art, top: offset, left: offset }])
    .png()
    .toFile(path.join(dir, file));
  console.log(`${file}  ${size}×${size}`);
}

await mkdir(OUT, { recursive: true });
await icon(192, 0.76, "icon-192.png");
await icon(512, 0.76, "icon-512.png");
// 잘려 나갈 가장자리를 비워 둔다
await icon(512, 0.56, "icon-maskable-512.png");
// 이 둘은 src/app 에 둔다. 거기 있으면 Next 가 <link> 까지 붙여 준다
await icon(180, 0.78, "apple-icon.png", APP);
await icon(64, 0.82, "icon.png", APP);
await favicon();

/**
 * favicon.ico.
 *
 * create-next-app 이 넣어 준 Next 로고가 그대로 있었다. 탭에 남의 로고가
 * 붙어 있는 건 발표 자리에서 바로 보인다.
 *
 * ICO 는 PNG 를 그대로 품을 수 있다(Vista 이후). 인코더를 새로 붙이지 않고
 * 32×32 PNG 앞에 22바이트짜리 머리말만 붙인다.
 */
async function favicon() {
  const size = 32;
  const inner = Math.round(size * 0.82);
  const art = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const offset = Math.round((size - inner) / 2);
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: GROUND },
  })
    .composite([{ input: art, top: offset, left: offset }])
    .png()
    .toBuffer();

  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // 예약
  header.writeUInt16LE(1, 2); // 종류: 아이콘
  header.writeUInt16LE(1, 4); // 그림 한 장
  header.writeUInt8(size, 6); // 너비
  header.writeUInt8(size, 7); // 높이
  header.writeUInt8(0, 8); // 색 수 — 팔레트 아님
  header.writeUInt8(0, 9); // 예약
  header.writeUInt16LE(1, 10); // 색 평면
  header.writeUInt16LE(32, 12); // 픽셀당 비트
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // 그림이 시작되는 자리

  await writeFile(path.join(APP, "favicon.ico"), Buffer.concat([header, png]));
  console.log(`favicon.ico  ${size}×${size}`);
}
