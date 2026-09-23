/**
 * `src/lib` 의 순수 함수가 약속대로 도는지 검사한다.
 *
 *   npm run check:lib
 *
 * AGENTS.md — "lib/*.ts 순수 함수. 여기 있는 건 전부 테스트 가능해야 한다".
 * 테스트 프레임워크를 붙이는 PR 에서 정식 테스트로 옮긴다. 그 전까지는 이 한 파일이다.
 */
import { projectOrtho, separateLabels } from "@/lib/ortho";
import { FOLLOW_MOVES, extendSequence, pick } from "@/lib/play";
import { UNLOCKS, decorationsAt, isGameOpen, newlyUnlocked, nextUnlock } from "@/lib/unlocks";
import { josa } from "@/lib/utils";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "통과" : "실패"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ─── 레벨마다 열리는 것 ─────────────────────────────────── */

check(
  "한 레벨에 하나씩 열린다",
  same(
    UNLOCKS.map((u) => u.level),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  ),
);
check("Lv.1 에는 운동 주사위만", same(decorationsAt(1), []) && isGameOpen("dice", 1));
check("Lv.5 섬에는 깃발 · 울타리", same(decorationsAt(5), ["flag", "fence"]));
check("레벨을 모르면 Lv.1 로 본다", same(decorationsAt(null), []) && isGameOpen("dice", undefined));
check("얼음땡은 Lv.3 부터", !isGameOpen("freeze", 2) && isGameOpen("freeze", 3));
check("다 열면 다음이 없다", nextUnlock(9) === null && nextUnlock(20) === null);
check("Lv.5 다음은 연못", nextUnlock(5)?.id === "pond");
check(
  "두 레벨을 한 번에 올라도 둘 다 열린 것으로",
  same(
    newlyUnlocked(3, 5).map((u) => u.id),
    ["fence", "follow"],
  ),
);
check("오르지 않았으면 새로 열린 것 없음", newlyUnlocked(5, 5).length === 0);
check("시작 레벨을 모르면 새로 열린 것 없음", newlyUnlocked(null, 5).length === 0);

/* ─── 조사 — 숫자는 읽는 소리대로 ────────────────────────── */

for (const [word, want] of [
  ["Lv.2", "가"],
  ["Lv.3", "이"],
  ["Lv.6", "이"],
  ["Lv.9", "가"],
  ["Lv.10", "이"],
  ["깃발", "이"],
  ["울타리", "가"],
] as const) {
  check(`${word}${want}`, josa(word, "이가") === want, josa(word, "이가"));
}

/* ─── 입체 그래프의 글자 자리 ────────────────────────────── */

const spec = { elevation: 20, azimuth: 0, target: 1, view: 2 };
const center = projectOrtho(spec, [0, 1, 0], 320, 160);
check(
  "카메라가 보는 점은 가운데",
  Math.abs(center.x - 160) < 1e-9 && Math.abs(center.y - 80) < 1e-9,
);
const higher = projectOrtho(spec, [0, 2, 0], 320, 160);
const lower = projectOrtho(spec, [0, 0, 0], 320, 160);
check(
  "정사영 — 같은 높이 차이는 어디서나 같은 픽셀",
  Math.abs(center.y - higher.y - (lower.y - center.y)) < 1e-9,
);
const moved = separateLabels([
  { x: 100, y: 100, w: 80, h: 20 },
  { x: 110, y: 110, w: 80, h: 20 },
  { x: 300, y: 100, w: 40, h: 20 },
]);
check("겹친 글자는 위의 것을 올린다", moved[0] <= 110 - 20 - 2 && moved[1] === 110);
check("안 겹친 글자는 그대로", moved[2] === 100);

/* ─── 따라 해 봐 ──────────────────────────────────────── */

let sequence: number[] = [];
let repeatsInRow = 0;
for (let i = 0; i < 200; i++) {
  sequence = extendSequence(sequence);
  if (sequence.length > 1 && sequence.at(-1) === sequence.at(-2)) repeatsInRow += 1;
}
check("순서는 하나씩 늘어난다", sequence.length === 200);
check("바로 앞 동작과 같은 게 이어 나오지 않는다", repeatsInRow === 0);
check(
  "동작 번호가 목록 안에 있다",
  sequence.every((n) => n >= 0 && n < FOLLOW_MOVES.length),
);
check(
  "고른 수는 0 이상 n 미만",
  Array.from({ length: 500 }, () => pick(6)).every((n) => n >= 0 && n < 6),
);

console.log(failed === 0 ? "\n전부 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
