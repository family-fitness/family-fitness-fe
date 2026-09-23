/**
 * 있는 그림 목록을 코드로 쓴다 — src/lib/asset-list.ts
 *
 *   npm run assets:list        (npm run assets 끝에 같이 돈다)
 *
 * 화면은 이 목록에 있는 그림만 부른다. 없는 그림을 불러 놓고 실패하면 숨기는 방식은
 * 그림이 오기 전까지 화면마다 404 를 쏟고, 사용자 폰에서 빈 상자가 한 번 번쩍인다.
 * 목록에 없으면 처음부터 대신 설 것(아이콘 · 코드 그림)을 그린다.
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIR = join(ROOT, "public/assets");
const OUT = join(ROOT, "src/lib/asset-list.ts");

export function listAssets() {
  const names = [];
  for (const category of readdirSync(DIR).sort()) {
    const dir = join(DIR, category);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir).sort()) {
      if (file.endsWith(".png")) names.push(`${category}/${file.slice(0, -4)}`);
    }
  }
  return names;
}

export function render(names) {
  return `/**
 * 있는 그림 목록. **손으로 고치지 않는다** — \`npm run assets:list\` 가 public/assets 를 보고 쓴다.
 * 화면은 여기 있는 그림만 부른다. 없으면 대신 설 것(아이콘 · 코드 그림)을 처음부터 그린다.
 */
export const ASSETS: ReadonlySet<string> = new Set([
${names.map((n) => `  ${JSON.stringify(n)},`).join("\n")}
]);
`;
}

// 스크립트로 직접 돌릴 때만 쓴다. check-assets 는 위 두 함수만 빌려 간다
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("list-assets.mjs")
) {
  const names = listAssets();
  writeFileSync(OUT, render(names));
  console.log(`그림 ${names.length}장 목록을 썼다 → src/lib/asset-list.ts`);
}
