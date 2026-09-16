/**
 * 화면이 부르는 그림이 실제로 있는지 검사한다.
 *
 * Illustration 은 파일이 없으면 조용히 숨는다 — 에셋이 오기 전에도 화면이
 * 깨지지 않게 하려는 의도지만, 오타가 나면 그림이 영원히 안 나오고
 * 아무도 모른다. 그래서 여기서 잡는다.
 *
 *   node scripts/check-assets.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// 경로에 한글이 있으면 URL.pathname 이 퍼센트 인코딩된 문자열을 준다
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ASSET_DIR = join(ROOT, "public/assets");
const SRC_DIR = join(ROOT, "src");
const SPEC = join(ROOT, "ASSET_PROMPTS.md");

/** public/assets 에 실제로 있는 이름들 ("move/move-situp" 꼴) */
const have = new Set();
for (const category of readdirSync(ASSET_DIR)) {
  const dir = join(ASSET_DIR, category);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".png")) have.add(`${category}/${file.slice(0, -4)}`);
  }
}

/**
 * 아직 안 받았지만 **주문은 한** 그림.
 *
 * ASSET_PROMPTS.md 에 적힌 이름은 오타가 아니라 기다리는 중이다.
 * 이걸 구분하지 않으면 2차 에셋을 기다리는 동안 검사가 늘 빨간색이라
 * 아무도 안 보게 된다.
 */
const ordered = new Set();
try {
  const spec = readFileSync(SPEC, "utf8");
  for (const [, name] of spec.matchAll(/`([a-z0-9-]+\/[a-z0-9-]+)`/g)) ordered.add(name);
} catch {
  // 명세가 없으면 주문된 것도 없다
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(full)) yield full;
  }
}

const missing = [];
const pending = new Set();
const used = new Set();

// 캐릭터 프레임은 `anim/${motion}-${n}` 으로 합쳐 만든다. 글자만 훑어서는 안 보인다
try {
  const src = readFileSync(join(ROOT, "src/lib/anim-frames.ts"), "utf8");
  for (const [, motion, count] of src.matchAll(/(\w+):\s*(\d+)/g)) {
    for (let i = 1; i <= Number(count); i += 1) used.add(`anim/${motion}-${i}`);
  }
} catch {
  // 아직 에셋을 넣지 않았다
}

/** 쓰고 있는데 파일이 없다 — 주문했으면 대기, 아니면 오타다 */
function note(file, name) {
  used.add(name);
  if (have.has(name)) return;
  if (ordered.has(name)) pending.add(name);
  else missing.push([file, name]);
}

for (const file of walk(SRC_DIR)) {
  const text = readFileSync(file, "utf8");

  // <Illustration name="move/move-situp" fallback="..." />
  for (const [, name] of text.matchAll(/(?:name|fallback)=["']([a-z0-9-]+\/[a-z0-9-]+)["']/g)) {
    note(relative(ROOT, file), name);
  }
  // EmptyState 의 scene="no-record" → scene/scene-no-record
  for (const [, scene] of text.matchAll(/scene=["']([a-z0-9-]+)["']/g)) {
    note(relative(ROOT, file), `scene/scene-${scene}`);
  }
  // "move/move-x" 처럼 따옴표 안에 직접 적힌 것 (fitness-items.ts 의 매핑표)
  for (const [, name] of text.matchAll(
    /["']((?:anim|bg|char|deco|item|move|scene|stamp)\/[a-z0-9-]+)["']/g,
  )) {
    note(relative(ROOT, file), name);
  }
}

const unused = [...have].filter((n) => !used.has(n) && !n.startsWith("char/")).sort();

if (missing.length > 0) {
  console.error("명세에도 없고 파일도 없다 — 이름이 틀렸다:");
  for (const [file, name] of missing) console.error(`  ${file} → ${name}`);
}

const usedOnDisk = [...used].filter((n) => have.has(n)).length;
console.log(`가진 그림 ${have.size}개 중 ${usedOnDisk}개 사용`);
if (pending.size > 0) {
  console.log(`2차 에셋 대기 ${pending.size}개: ${[...pending].sort().join(", ")}`);
}
if (unused.length > 0) {
  console.log(`아직 안 쓴 것 ${unused.length}개: ${unused.join(", ")}`);
}

process.exit(missing.length > 0 ? 1 : 0);
