/**
 * `src/lib` 의 순수 함수가 약속대로 도는지 검사한다.
 *
 *   npm run check:lib
 *
 * AGENTS.md — "lib/*.ts 순수 함수. 여기 있는 건 전부 테스트 가능해야 한다".
 * 테스트 프레임워크를 붙이는 PR 에서 정식 테스트로 옮긴다. 그 전까지는 이 한 파일이다.
 */
import type { ClipView } from "@/lib/api/types";
import type { DayLog } from "@/lib/api/types";
import { projectOrtho, separateLabels } from "@/lib/ortho";
import { FOLLOW_MOVES, extendSequence, pick } from "@/lib/play";
import {
  MAX_MOVES,
  repeatDates,
  routineMinutes,
  routineTitle,
  setMinutes,
  shift,
  tidy,
  toSessions,
  toggleMove,
  upcomingDays,
} from "@/lib/routine";
import { dayRings, daySummary, plannedDay } from "@/lib/day";
import { isEmpty, rangeLabel, weekRecap } from "@/lib/recap";
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

/* ─── 직접 짜기 ──────────────────────────────────────── */

const clip = (id: string, phase: ClipView["phase"]): ClipView => ({
  clipId: id,
  videoId: `v-${id}`,
  startSec: 0,
  endSec: 30,
  title: `동작 ${id}`,
  factor: null,
  phase,
  homeOk: true,
  quiet: true,
  props: false,
  favorited: false,
});

let moves = toggleMove([], clip("a", "MAIN"));
moves = toggleMove(moves, clip("b", "WARMUP"));
moves = toggleMove(moves, clip("c", "COOLDOWN"));
moves = toggleMove(moves, clip("d", "MAIN"));
check(
  "본운동은 3분, 준비 · 정리는 1분으로 담긴다",
  same(
    moves.map((m) => m.minutes),
    [3, 1, 1, 3],
  ),
);
check("한 번 더 누르면 뺀다", toggleMove(moves, clip("b", "WARMUP")).length === 3);
const full = Array.from({ length: 12 }, (_, i) => clip(`x${i}`, "MAIN")).reduce(toggleMove, []);
check(`${MAX_MOVES}개까지만 담는다`, full.length === MAX_MOVES);
check(
  "준비 → 본 → 정리, 같은 단계는 담은 차례대로",
  same(
    tidy(moves).map((m) => m.clip.clipId),
    ["b", "a", "d", "c"],
  ),
);
check(
  "한 칸 위로",
  same(
    shift(moves, 1, -1).map((m) => m.clip.clipId),
    ["b", "a", "c", "d"],
  ),
);
check("맨 위에서 위로는 그대로", shift(moves, 0, -1) === moves);
check(
  "시간은 1~5분",
  setMinutes(moves, 0, 9)[0].minutes === 5 && setMinutes(moves, 0, 0)[0].minutes === 1,
);
check("합한 시간", routineMinutes(moves) === 8);
const sessions = toSessions(tidy(moves));
check(
  "칸 차례는 1부터",
  same(
    sessions.map((s) => s.position),
    [1, 2, 3, 4],
  ),
);
check("영상 구간이 칸에 붙는다", sessions[0].clip?.videoId === "v-b");
check("제목은 본운동 첫 동작", routineTitle(tidy(moves)) === "동작 a 외 3개");
check("동작이 없으면 기본 제목", routineTitle([]) === "직접 짠 운동");

check(
  "오늘부터 이레",
  same(upcomingDays("2026-09-23", 3), ["2026-09-23", "2026-09-24", "2026-09-25"]),
);
check(
  "고른 요일을 두 주 되풀이",
  same(repeatDates(["2026-09-23", "2026-09-25"], 2), [
    "2026-09-23",
    "2026-09-25",
    "2026-09-30",
    "2026-10-02",
  ]),
);
check("되풀이는 4주까지", repeatDates(["2026-09-23"], 9).length === 4);
check("겹친 날은 한 번만", repeatDates(["2026-09-23", "2026-09-23"], 1).length === 1);

/* ─── 지난주 돌아보기 ─────────────────────────────────── */

const log = (date: string, minutes: number, stickers = 0): DayLog => ({
  date,
  minutes,
  plannedMinutes: null,
  entries: [],
  stickers: Array.from({ length: stickers }, (_, i) => ({
    cheerId: `${date}-${i}`,
    stickerId: "star",
    fromProfileId: "p",
    fromName: "엄마",
    message: null,
    missionId: null,
    createdAt: `${date}T19:00:00+09:00`,
  })),
});
const week = { from: "2026-09-14", to: "2026-09-20" };
const recap = weekRecap(
  [
    log("2026-09-13", 50),
    log("2026-09-14", 12, 1),
    log("2026-09-16", 25),
    log("2026-09-18", 25, 2),
    log("2026-09-19", 0),
  ],
  [
    { code: "A", title: "사흘 이어서", description: "", earnedAt: "2026-09-16T20:00:00+09:00" },
    { code: "B", title: "첫 스티커", description: "", earnedAt: "2026-09-02T20:00:00+09:00" },
    { code: "C", title: "아직", description: "", earnedAt: null },
  ],
  week,
);
check("그 주 안의 움직인 날만 센다", recap.days === 3);
check("그 주 안의 분만 더한다", recap.minutes === 62);
check(
  "가장 많이 한 날 — 같으면 이른 날",
  recap.best?.date === "2026-09-16" && recap.best.minutes === 25,
);
check("그 주에 받은 스티커", recap.stickers === 3);
check("그 주에 받은 업적만", same(recap.badges, ["사흘 이어서"]));
check("하루도 없으면 가장 많이 한 날도 없다", weekRecap([], [], week).best === null);
check(
  "같은 분이면 이른 날 — 늦은 날부터 받아도",
  weekRecap([log("2026-09-18", 25), log("2026-09-16", 25)], [], week).best?.date === "2026-09-16",
);
check("적을 것이 없으면 비었다", isEmpty(weekRecap([log("2026-09-15", 0)], [], week)));
check("스티커만 받은 주는 비지 않았다", !isEmpty(weekRecap([log("2026-09-15", 0, 1)], [], week)));
check("같은 달 범위", rangeLabel("2026-09-14", "2026-09-20") === "9월 14일 ~ 20일");
check("달이 바뀌는 범위", rangeLabel("2026-08-31", "2026-09-06") === "8월 31일 ~ 9월 6일");

/* ─── 하루 기록 ─────────────────────────────────────────── */

const dayLog: DayLog = {
  date: "2026-09-23",
  minutes: 9,
  plannedMinutes: 12,
  entries: [
    {
      missionId: "m1",
      title: "유연성 키우기",
      minutes: 9,
      verifiedBy: "TIMER",
      completed: false,
      sessions: [
        { title: "a", phase: "WARMUP", minutes: 1, done: true },
        { title: "b", phase: "MAIN", minutes: 4, done: true },
        { title: "c", phase: "MAIN", minutes: 4, done: true },
        { title: "d", phase: "COOLDOWN", minutes: 3, done: false },
      ],
    },
    { missionId: "m2", title: "걷기", minutes: 0, verifiedBy: "SELF_REPORT", completed: true },
  ],
  stickers: [],
};
const day = daySummary(dayLog);
check("칸 없는 운동은 한 칸으로 센다", day.total === 5 && day.done === 4);
check("끝낸 칸의 분만 단계마다", same(day.phases, { WARMUP: 1, MAIN: 8, COOLDOWN: 0 }));
check("확인 방법은 한 번씩", same(day.verified, ["TIMER", "SELF_REPORT"]));
check("잡힌 시간 대비 · 칸 대비 · 스티커 없음", same(dayRings(day), [0.75, 0.8, 0]));
check("목표를 넘겨도 한 바퀴", dayRings(daySummary({ ...dayLog, minutes: 30 }))[0] === 1);
check(
  "잡힌 운동 없이 움직인 날은 한 바퀴",
  dayRings(daySummary({ ...dayLog, plannedMinutes: null }))[0] === 1,
);
check("기록이 없는 날은 전부 비었다", same(dayRings(daySummary(undefined)), [0, 0, 0]));
const mission = (startDate: string, endDate: string, targetMetric = "TIMER_MINUTES") =>
  ({ missionId: "x", startDate, endDate, targetMetric }) as unknown as Parameters<
    typeof plannedDay
  >[0];
check(
  "앞날 운동은 그 첫날에",
  plannedDay(mission("2026-09-26", "2026-09-26"), "2026-09-24") === "2026-09-26",
);
check(
  "이미 시작한 긴 운동은 오늘에",
  plannedDay(mission("2026-09-20", "2026-09-30"), "2026-09-24") === "2026-09-24",
);
check(
  "끝난 운동은 캘린더에 서지 않는다",
  plannedDay(mission("2026-09-20", "2026-09-21"), "2026-09-24") === null,
);
check(
  "걸음수는 잡아 둔 운동이 아니다",
  plannedDay(mission("2026-09-26", "2026-09-26", "STEPS"), "2026-09-24") === null,
);

console.log(failed === 0 ? "\n전부 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
