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

/** public/assets 에 실제로 있는 이름들 ("move/move-situp" 꼴) */
const have = new Set();
for (const category of readdirSync(ASSET_DIR)) {
  const dir = join(ASSET_DIR, category);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".png")) have.add(`${category}/${file.slice(0, -4)}`);
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(full)) yield full;
  }
}

const missing = [];
const used = new Set();

for (const file of walk(SRC_DIR)) {
  const text = readFileSync(file, "utf8");

  // <Illustration name="move/move-situp" />
  for (const [, name] of text.matchAll(/name=["']([a-z0-9-]+\/[a-z0-9-]+)["']/g)) {
    used.add(name);
    if (!have.has(name)) missing.push([relative(ROOT, file), name]);
  }
  // EmptyState 의 scene="no-record" → scene/scene-no-record
  for (const [, scene] of text.matchAll(/scene=["']([a-z0-9-]+)["']/g)) {
    const name = `scene/scene-${scene}`;
    used.add(name);
    if (!have.has(name)) missing.push([relative(ROOT, file), name]);
  }
  // "move/move-x" 처럼 따옴표 안에 직접 적힌 것 (fitness-items.ts 의 매핑표)
  for (const [, name] of text.matchAll(/["']((?:char|deco|item|move|scene)\/[a-z0-9-]+)["']/g)) {
    used.add(name);
    if (!have.has(name)) missing.push([relative(ROOT, file), name]);
  }
}

const unused = [...have].filter((n) => !used.has(n) && !n.startsWith("char/")).sort();

if (missing.length > 0) {
  console.error("없는 그림을 부르고 있다:");
  for (const [file, name] of missing) console.error(`  ${file} → ${name}`);
}

console.log(`그림 ${have.size}개 중 ${used.size}개 사용`);
if (unused.length > 0) {
  console.log(`아직 안 쓴 것 ${unused.length}개: ${unused.join(", ")}`);
}

process.exit(missing.length > 0 ? 1 : 0);
