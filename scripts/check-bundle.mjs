/**
 * 운영 빌드의 브라우저 번들에 목 서버 코드와 개발용 계정이 남지 않았는지 본다.
 *
 *   NEXT_PUBLIC_API_MOCKING= NEXT_PUBLIC_GOOGLE_CLIENT_ID=<아무 값> npm run build
 *   npm run check:bundle
 *
 * 목을 끄고 구글 키를 넣은 빌드에 대고 돌린다. 목을 켜거나 구글 키를 비운 빌드에는 개발용 계정이
 * 일부러 들어가므로 이 검사가 실패하는 게 맞다.
 *
 * 누구나 받아 갈 수 있는 곳은 `.next/static` 이라 거기만 본다.
 * public/mockServiceWorker.js 는 MSW 가 만든 빈 워커라 목 데이터가 없다. 그래서 여기서 보지 않는다.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../.next/static", import.meta.url));

/** 번들에 있으면 안 되는 말 — MSW 워커를 붙이는 코드, 목 데이터, 개발용 계정 */
const FORBIDDEN = [
  "setupWorker",
  "K7M2QT",
  "demo-parent",
  "demo-fresh",
  "개발용으로 구글 없이 들어가기",
  "초대받은 계정",
  "구글 키가 없는 개발 빌드",
  // package.json 을 통째로 import 하면 들어오는 칸 — 버전 하나 때문에 개발 도구 목록이 번들에 실렸었다
  "devDependencies",
  "lint-staged",
];

/** 압축기가 한글을 \uXXXX 꼴로 적어 둘 수도 있어 그 꼴로도 찾는다 */
const escaped = (word) =>
  word.replace(/[^\x20-\x7e]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.name.endsWith(".js")) yield path;
  }
}

try {
  readdirSync(root);
} catch {
  console.error("실패  .next/static 이 없다 — 먼저 npm run build 를 돌린다");
  process.exit(1);
}

let failed = 0;
let seen = 0;
for (const path of files(root)) {
  seen += 1;
  const text = readFileSync(path, "utf8");
  const hits = FORBIDDEN.filter((word) => text.includes(word) || text.includes(escaped(word)));
  if (hits.length > 0) {
    failed += 1;
    console.log(`실패  ${path.slice(root.length + 1)} — ${hits.join(", ")}`);
  }
}

console.log(`${failed === 0 ? "통과" : "실패"}  조각 ${seen}개 가운데 걸린 것 ${failed}개`);
process.exit(failed === 0 ? 0 : 1);
