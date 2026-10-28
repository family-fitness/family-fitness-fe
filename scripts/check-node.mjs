/**
 * 검사 전에 Node 판을 확인한다.
 *
 *   npm run check:node
 *
 * 이 저장소는 Node 22 이상(.nvmrc, package.json engines)에서 돈다. Node 20 으로 돌리면 tsx 가
 * src/lib/api/client.ts 를 두 번 불러 ApiError 가 둘이 되고, 화면 코드는 맞는데도 check:lib 3건 ·
 * check:mocks 2건이 실패한다(#161). 그 실패를 코드 잘못으로 읽지 않게 시험보다 먼저 멈춘다.
 */
import { readFileSync } from "node:fs";

const want = Number(
  readFileSync(new URL("../.nvmrc", import.meta.url), "utf8")
    .trim()
    .split(".")[0],
);
const have = Number(process.versions.node.split(".")[0]);

if (have < want) {
  console.error(`Node ${want} 이상이 필요해요. 지금은 v${process.versions.node} 입니다.`);
  console.error("nvm use 로 .nvmrc 의 판으로 바꾼 뒤 다시 돌려 주세요.");
  process.exit(1);
}
console.log(`Node v${process.versions.node} — 통과`);
