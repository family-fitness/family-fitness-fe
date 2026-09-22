/**
 * 에셋 준비 — 투명 여백을 잘라내고 public/assets 로 옮긴다.
 *
 *   node scripts/prepare-assets.mjs [원본폴더]
 *
 * 왜 필요한가
 *   이미지 생성 AI 가 뽑은 PNG 는 그림이 1024 캔버스 가운데에 놓이고 사방에 여백이 남는다.
 *   부품마다 여백 크기가 달라서 그대로 겹치면 위치가 안 맞는다.
 *   여백을 잘라 그림만 남기면 CSS 에서 비율로 배치할 수 있다.
 *
 *   알파가 거의 0 인 잔여 픽셀도 함께 버린다. 그게 남아 있으면 잘라낸 상자가
 *   실제 그림보다 훨씬 커진다 — 머리 하나가 캔버스 절반을 차지하는 것처럼 보인다.
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2] ?? "family-fitness-assets/public/assets";
const OUT = "public/assets";
/** 이 값 이하의 알파는 없는 픽셀로 본다 */
const ALPHA_THRESHOLD = 24;

/**
 * 분류별 최대 변 길이.
 *
 * 원본은 1024 인데 화면에서 가장 크게 쓰는 곳이 140px 다. 2배 화면을 감안해도
 * 280px 면 충분하다. 원본 그대로 두면 79장에 27MB 라 폰에서 느리고 저장소도 무겁다.
 */
const MAX_EDGE = {
  char: 256,
  item: 256,
  deco: 256,
  move: 384,
  scene: 384,
  anim: 384,
  stamp: 256,
  // 배경은 화면 폭을 채운다. 2배 화면까지 감안해 가로를 넉넉히 둔다
  bg: 1024,
};

/**
 * 여백을 잘라내지 않는 분류.
 *
 * 배경은 가로로 긴 띠라서 여백째로 구도가 완성돼 있다. 잘라내면 구름만 남아
 * 화면 폭에 맞춰 늘어나면서 뭉개진다.
 */
const KEEP_MARGIN = new Set(["bg"]);

/**
 * 프레임을 **한 장씩 잘라내면 안 되는** 분류.
 *
 * `anim/` 은 한 동작을 3장으로 나눠 번갈아 보여준다. 장마다 여백을 따로 잘라내면
 * 그림이 캔버스를 꽉 채우도록 각각 커져서, 프레임이 바뀔 때마다 캐릭터가
 * 커졌다 작아졌다 하고 발 위치도 튄다 — 애니메이션이 아니라 덜컥거림이 된다.
 *
 * 같은 묶음(`jump-1·jump-2·jump-3`)은 **모든 프레임을 합친 상자**로 함께 자른다.
 * 그러면 서로의 상대 위치가 원본 그대로 남는다.
 */
const GROUPED = new Set(["anim"]);

/** "jump-2.png" → "jump". 묶음 이름을 뽑는다 */
function bundleOf(entry) {
  return entry.replace(/-\d+\.png$/, "");
}

/** 상자 여럿을 모두 담는 하나의 상자 */
function unionBox(boxes) {
  const left = Math.min(...boxes.map((b) => b.left));
  const top = Math.min(...boxes.map((b) => b.top));
  const right = Math.max(...boxes.map((b) => b.left + b.width));
  const bottom = Math.max(...boxes.map((b) => b.top + b.height));
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * 팔레트 PNG 로 저장한다.
 * 플랫 벡터라 실제로 쓰인 색이 몇 개뿐이어서 색을 줄여도 눈에 띄는 손실이 없다.
 * WebP 손실 압축이 더 작지만 굵은 외곽선 둘레에 얼룩이 생긴다.
 */
const PALETTE_COLOURS = 64;

/**
 * 한 장 안에 그림이 몇 덩어리로 흩어져 있는지 센다.
 *
 * 이미지 생성 AI 가 가끔 캐릭터 한 명 대신 **작은 캐릭터를 격자로 늘어놓은 장**을
 * 내놓는다. 그게 애니메이션에 섞이면 한 프레임만 확 달라져서 튄다.
 * 사람 하나면 가로·세로 모두 한 덩어리다.
 */
async function blobCount(file) {
  const image = sharp(file);
  const { width, height } = await image.metadata();
  const alpha = await image.ensureAlpha().extractChannel(3).raw().toBuffer();

  const cols = new Array(width).fill(0);
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (alpha[y * width + x] > ALPHA_THRESHOLD) {
        cols[x] = 1;
        rows[y] = 1;
      }
    }
  }

  const islands = (profile, gap) => {
    let count = 0;
    let empty = gap + 1;
    for (const v of profile) {
      if (v) {
        if (empty > gap) count += 1;
        empty = 0;
      } else empty += 1;
    }
    return count;
  };

  // 화면 크기에 비례한 틈만 "끊겼다" 로 본다
  return Math.max(islands(cols, width * 0.02), islands(rows, height * 0.02));
}

/** 알파 채널을 훑어 그림이 실제로 있는 사각형을 찾는다 */
async function solidBox(file) {
  const image = sharp(file);
  const { width, height } = await image.metadata();
  const alpha = await image.ensureAlpha().extractChannel(3).raw().toBuffer();

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[y * width + x] <= ALPHA_THRESHOLD) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

const report = [];

for (const group of await readdir(SRC, { withFileTypes: true })) {
  if (!group.isDirectory()) continue;

  const from = path.join(SRC, group.name);
  const to = path.join(OUT, group.name);
  await mkdir(to, { recursive: true });

  const files = (await readdir(from)).filter((f) => f.endsWith(".png"));

  // 잘라낼 상자를 먼저 다 구한다. 묶음으로 자를 분류는 여기서 합친다
  const boxes = new Map();
  for (const entry of files) {
    const box = await solidBox(path.join(from, entry));
    if (!box) {
      console.warn(`비어 있음: ${group.name}/${entry}`);
      continue;
    }
    boxes.set(entry, box);
  }

  /*
    격자로 뽑힌 프레임과, 혼자만 장식이 붙어 크기가 확 다른 프레임을 걸러낸다.
    걸러낸 장은 옮기지 않는다. 화면은 동작마다 고른 한 장만 쓴다.
  */
  const rejected = [];
  if (GROUPED.has(group.name)) {
    for (const entry of [...boxes.keys()]) {
      if ((await blobCount(path.join(from, entry))) > 1) {
        rejected.push(entry);
        boxes.delete(entry);
      }
    }
    /*
      장식이 덧붙은 장을 걸러낸다.

      같은 사람이 같은 자리에 서 있으므로 팔을 벌려도 폭은 두 배 남짓이다.
      가장 좁은 장의 2.5배를 넘으면 사람이 커진 게 아니라 뭔가 덧그려진 것이다 —
      실제로 몇 장에만 파란 물결 고리가 둘려 있었다.
      중앙값 대신 최솟값과 견준다. 망가진 장이 과반이면 중앙값이 같이 망가진다.
    */
    const byBundle = new Map();
    for (const [entry, box] of boxes) {
      const key = bundleOf(entry);
      byBundle.set(key, [...(byBundle.get(key) ?? []), [entry, box.width]]);
    }
    for (const [, list] of byBundle) {
      const narrowest = Math.min(...list.map(([, w]) => w));
      for (const [entry, w] of list) {
        if (w > narrowest * 2.5) {
          rejected.push(entry);
          boxes.delete(entry);
        }
      }
    }
    if (rejected.length > 0) {
      console.warn(`다시 뽑아야 할 프레임: ${rejected.sort().join(", ")}`);
    }
  }

  if (GROUPED.has(group.name)) {
    const bundles = new Map();
    for (const [entry, box] of boxes) {
      const key = bundleOf(entry);
      bundles.set(key, [...(bundles.get(key) ?? []), box]);
    }
    for (const [entry] of boxes) {
      boxes.set(entry, unionBox(bundles.get(bundleOf(entry))));
    }
  }

  for (const entry of files) {
    const box = boxes.get(entry);
    if (!box) continue;

    const src = path.join(from, entry);
    const maxEdge = MAX_EDGE[group.name] ?? 320;
    const pipeline = sharp(src);
    if (!KEEP_MARGIN.has(group.name)) pipeline.extract(box);
    const info = await pipeline
      .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
      .png({ palette: true, colours: PALETTE_COLOURS, compressionLevel: 9 })
      .toFile(path.join(to, entry));

    report.push({
      file: `${group.name}/${entry}`,
      width: info.width,
      height: info.height,
      bytes: info.size,
    });
  }
}

await writeFile(
  path.join(OUT, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), assets: report }, null, 2) + "\n",
);

const total = report.reduce((sum, r) => sum + r.bytes, 0);
console.log(`${report.length}장 정리 완료 → ${OUT} (${(total / 1024 / 1024).toFixed(1)}MB)`);
