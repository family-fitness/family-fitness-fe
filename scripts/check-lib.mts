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
import {
  TIERS,
  daysLeftText,
  leagueScore,
  nextTier,
  placeAt,
  prevTier,
  zoneOf,
} from "@/lib/league";
import { NO_PEER_NORMS_NOTE, memberNoPeerNormsNote, noPeerNormsNote } from "@/lib/fitness-factors";
import { VERIFIED_COPY } from "@/lib/mission";
import { projectOrtho } from "@/lib/ortho";
import { withJosa } from "@/lib/utils";
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
import {
  dayRings,
  daySummary,
  dayWork,
  didSomething,
  isRealDate,
  missionsOn,
  missionTitle,
  plannedDay,
  todayLine,
} from "@/lib/day";
import { UNLOCKS, decorationsAt, newlyUnlocked, nextUnlock } from "@/lib/unlocks";
import { orderSessions, proposalSessions, sessionsOf, totalMinutes } from "@/lib/session-plan";
import { todayActivity } from "@/lib/activity";
import { josa } from "@/lib/utils";
import {
  WATCH_TITLE_MAX,
  afterFileFailure,
  fileType,
  finderHref,
  finderOwner,
  finderCount,
  childFinderHref,
  finderScope,
  joinClipPages,
  nextCursorOf,
  kspoVideo,
  videoLink,
  watchHref,
  watchTitle,
} from "@/lib/videos";
import {
  callName,
  canRemoveMember,
  familySetupPath,
  guardiansName,
  mustAddChild,
  mustSetUpFamily,
  openWithoutChild,
  removeMemberCopy,
} from "@/lib/family";
import {
  CREATE_AT,
  guardianAgeProblem,
  guardianOldEnough,
  onboardingSteps,
} from "@/lib/onboarding";

import { PRIVACY_HREF, PRIVACY_POLICY, TERMS_HREF, TERMS_OF_SERVICE } from "@/lib/legal";
import { REVIEW_WAYS, afterSignIn, reviewDestination } from "@/lib/review-login";
import {
  childBirthRule,
  guardianBirthRule,
  inRule,
  koreanDate,
  measuredRule,
  openingDate,
  parseDate,
  yearsBefore,
} from "@/lib/date-pick";
import { daysBefore } from "@/lib/today";
import {
  WITHDRAWAL_COPY,
  WITHDRAWN_NOTICE,
  WITHDRAWN_PATH,
  cameAfterWithdrawal,
  withdrawalCase,
} from "@/lib/withdrawal";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BAND_COPY, FOCUS_COPY } from "@/lib/api/types";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "통과" : "실패"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/* ─── 레벨마다 열리는 것 ─────────────────────────────────── */

check(
  "Lv.2 부터 한 레벨에 하나씩 열린다",
  same(
    UNLOCKS.map((u) => u.level),
    [2, 3, 4, 5, 6, 7],
  ),
);
check("Lv.1 섬에는 아직 장식이 없다", same(decorationsAt(1), []));
check(
  "Lv.5 섬에는 깃발 · 울타리 · 연못 · 텐트",
  same(decorationsAt(5), ["flag", "fence", "pond", "tent"]),
);
check("레벨을 모르면 Lv.1 로 본다", same(decorationsAt(null), []));
check("다 열면 다음이 없다", nextUnlock(7) === null && nextUnlock(20) === null);
check("Lv.5 다음은 풍차", nextUnlock(5)?.id === "windmill");
check(
  "두 레벨을 한 번에 올라도 둘 다 열린 것으로",
  same(
    newlyUnlocked(2, 4).map((u) => u.id),
    ["fence", "pond"],
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

/* ─── 조사 「으로 · 로」 ──────────────────────────────── */

check("받침 있으면 「으로」 — 플래티넘으로", withJosa("플래티넘", "으로로") === "플래티넘으로");
check(
  "받침 없으면 「로」 — 골드로 · 다이아로",
  withJosa("골드", "으로로") === "골드로" && withJosa("다이아", "으로로") === "다이아로",
);
check("받침 ㄹ 뒤는 「로」 — 서울로", withJosa("서울", "으로로") === "서울로");
check(
  "받침 없으면 「를」 — 윗몸말아올리기를 · 악력을",
  withJosa("윗몸말아올리기", "을를") === "윗몸말아올리기를" &&
    withJosa("악력", "을를") === "악력을",
);
check(
  "뒤 괄호는 읽지 않는다 — 상대악력(%)을 · 왕복오래달리기(15m)를",
  withJosa("상대악력(%)", "을를") === "상대악력(%)을" &&
    withJosa("왕복오래달리기(15m)", "을를") === "왕복오래달리기(15m)를",
);

/* ─── 가족 리그 ──────────────────────────────────────── */

check(
  "티어는 아래부터 다섯",
  same(
    TIERS.map((t) => t.id),
    ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"],
  ),
);
check(
  "다이아 위도 브론즈 아래도 없다",
  nextTier("DIAMOND") === null && prevTier("BRONZE") === null,
);
check("골드 한 칸 위는 플래티넘", nextTier("GOLD") === "PLATINUM" && prevTier("GOLD") === "SILVER");
check(
  "열 가족 · 셋 올라가고 셋 내려간다",
  zoneOf(3, 10, 3, 3) === "up" && zoneOf(4, 10, 3, 3) === "stay" && zoneOf(8, 10, 3, 3) === "down",
);
check("브론즈는 내려가는 자리가 없다", zoneOf(10, 10, 3, 0) === "stay");
check(
  "작은 묶음에서 올라가는 자리와 내려가는 자리가 겹치지 않는다",
  zoneOf(2, 5, 3, 3) === "up" && zoneOf(3, 5, 3, 3) === "stay" && zoneOf(4, 5, 3, 3) === "down",
);
check(
  "하루만 해낸 100% 는 스무 날 중 열여덟 날 해낸 92% 보다 점수가 낮다",
  leagueScore(1, 1, 20) < leagueScore(0.92, 18, 20),
);
check("지난 날마다 다 해내면 점수 1", leagueScore(1, 20, 20) === 1);
check("지난 날이 없으면 점수 0", leagueScore(1, 0, 0) === 0);
const table = [
  { rate: 92, score: 0.87 },
  { rate: 100, score: 0.23 },
  { rate: 100, score: 0.23 },
  { rate: null, score: null },
];
check(
  "등수는 점수로 센다 — 달성률 100% 가 92% 아래에 선다",
  placeAt(table, 0) === 1 && placeAt(table, 1) === 2,
);
check("점수가 같으면 같은 등수", placeAt(table, 2) === 2);
check("점수가 없는 집은 등수가 없다", placeAt(table, 3) === null);
check("옛 서버처럼 점수가 없으면 달성률로 센다", placeAt([{ rate: 70 }, { rate: 90 }], 0) === 2);

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

/* ─── 칸 시간 ─────────────────────────────────────────── */

check(
  "시간이 없거나 0분인 칸은 1분 — 운동하기 타이머와 같은 셈",
  totalMinutes([{ minutes: 5 }, { minutes: null }, { minutes: 0 }]) === 7,
);
{
  // 영상 완주 운동은 칸도 시간도 없이 온다 — 오늘 목표가 1분이 되지 않고 적어 둔 시간으로 물러선다
  const video = {
    missionId: "v",
    startDate: "2026-09-24",
    endDate: "2026-09-24",
    targetMetric: "VIDEO_DONE",
    participants: [{ profileId: "A", completed: false }],
  } as unknown as NonNullable<Parameters<typeof todayActivity>[0]["missions"]>[number];
  const goal = todayActivity({
    profileId: "A",
    missions: [video],
    weekLogs: [],
    availability: { slots: [{ day: "THU", start: "18:00", minutes: 30 }] } as unknown as Parameters<
      typeof todayActivity
    >[0]["availability"],
    now: "2026-09-24",
  }).goal;
  check("시간 없는 영상 운동의 날 목표는 적어 둔 운동 시간", goal === 30, `${goal}분`);
}

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
check(
  "직접 적은 걸음수는 끝낸 운동으로 세지 않는다(홈 링과 같게)",
  day.total === 4 && day.done === 3,
);
check("끝낸 칸의 분만 단계마다", same(day.phases, { WARMUP: 1, MAIN: 8, COOLDOWN: 0 }));
check("확인 방법은 한 번씩", same(day.verified, ["TIMER", "SELF_REPORT"]));
check("잡힌 시간 대비 · 칸 대비 — 칭찬은 링이 아니다", same(dayRings(day), [0.75, 0.75]));
check("목표를 넘겨도 한 바퀴", dayRings(daySummary({ ...dayLog, minutes: 30 }))[0] === 1);
check(
  "잡힌 운동 없이 움직인 날은 한 바퀴",
  dayRings(daySummary({ ...dayLog, plannedMinutes: null }))[0] === 1,
);
check("기록이 없는 날은 전부 비었다", same(dayRings(daySummary(undefined)), [0, 0]));
check(
  "칸 없이 타이머로 확인된 운동은 한 칸",
  daySummary({
    ...dayLog,
    entries: [
      { missionId: "t", title: "달리기", minutes: 5, verifiedBy: "TIMER", completed: true },
    ],
  }).total === 1,
);
check("한 칸이라도 끝냈으면 한 운동", didSomething(dayLog.entries[0]));
check(
  "하나도 안 한 운동은 할 운동",
  !didSomething({
    ...dayLog.entries[0],
    minutes: 0,
    completed: false,
    sessions: [{ title: "a", phase: "MAIN", minutes: 1, done: false }],
  }),
);
check(
  "칸 없이 움직인 분만 있어도 한 운동(반쯤 본 영상)",
  didSomething({ missionId: "v", title: "영상", minutes: 3, verifiedBy: null, completed: false }),
);
check(
  "직접 적어 낸 걸음수는 확인 전에도 한 것으로 보인다",
  didSomething({ ...dayLog.entries[1], completed: false }),
);
check("달력에 있는 날", isRealDate("2026-09-23") && isRealDate("2024-02-29"));
check(
  "달력에 없는 날은 거른다",
  !isRealDate("2026-13-01") &&
    !isRealDate("2026-02-30") &&
    !isRealDate("../x") &&
    !isRealDate(null) &&
    !isRealDate("1000-01-01") &&
    !isRealDate("9999-12-31"),
);
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
check(
  "오늘 운동 화면의 제목 — 오늘 하는 운동이면 「오늘 운동」",
  missionTitle(mission("2026-09-24", "2026-09-24"), "2026-09-24") === "오늘 운동" &&
    missionTitle(mission("2026-09-20", "2026-09-30"), "2026-09-24") === "오늘 운동",
);
check(
  "앞날 · 지난 운동의 제목은 그날 날짜 — 10월 13일 운동을 열었는데 「오늘 운동」 이었다",
  missionTitle(mission("2026-10-13", "2026-10-13"), "2026-10-06") === "10월 13일 운동" &&
    missionTitle(mission("2026-10-01", "2026-10-01"), "2026-10-06") === "10월 1일 운동",
  `${missionTitle(mission("2026-10-13", "2026-10-13"), "2026-10-06")}`,
);

/* ─── 한 사람의 오늘 — 끝낸 칸은 사람마다 ─────────────────── */

{
  const shared = {
    missionId: "m",
    startDate: "2026-09-24",
    endDate: "2026-09-24",
    targetMetric: "TIMER_MINUTES",
    sessions: [
      { position: 1, phase: "WARMUP", title: "a", minutes: 1 },
      { position: 2, phase: "MAIN", title: "b", minutes: 4 },
    ],
    participants: [
      { profileId: "A", completed: false, doneSessions: [1, 2] },
      { profileId: "B", completed: false, doneSessions: [] },
    ],
  } as unknown as Parameters<typeof plannedDay>[0];
  const a = dayWork([shared], "A", "2026-09-24");
  const b = dayWork([shared], "B", "2026-09-24");
  check("형제가 같은 운동을 받아도 끝낸 칸은 저마다", a.done === 2 && b.done === 0);
  check(
    "한마디 — 다 했어요 · 운동 있어요",
    todayLine(a, false) === "오늘 다 했어요" && todayLine(b, false) === "오늘 운동 있어요",
  );
  check("쉬는 날이어도 한 만큼이 먼저", todayLine(a, true) === "오늘 다 했어요");
  check("아직이면 쉬는 날", todayLine(b, true) === "오늘 쉬는 날");
  check("참여자가 아니면 오늘 운동이 없다", dayWork([shared], "C", "2026-09-24").total === 0);
  const older = {
    ...shared,
    sessions: [
      { position: 1, phase: "WARMUP", title: "a", minutes: 1, completed: true },
      { position: 2, phase: "MAIN", title: "b", minutes: 4 },
    ],
    participants: [{ profileId: "A", completed: false }],
  } as unknown as Parameters<typeof plannedDay>[0];
  check(
    "사람마다의 기록이 아직 안 오면 칸의 끝냄으로 물러선다",
    dayWork([older], "A", "2026-09-24").done === 1,
  );
  check(
    "사람마다의 기록이 오면 칸에 적힌 끝냄은 믿지 않는다",
    dayWork(
      [
        {
          ...older,
          participants: [{ profileId: "A", completed: false, doneSessions: [] }],
        } as unknown as Parameters<typeof plannedDay>[0],
      ],
      "A",
      "2026-09-24",
    ).done === 0,
  );
  check(
    "끝나는 날이 없는 운동은 하루짜리",
    missionsOn([{ ...shared, endDate: undefined }], "A", "2026-09-24").length === 1 &&
      missionsOn([{ ...shared, endDate: undefined }], "A", "2026-09-25").length === 0,
  );
  check(
    "걸음수는 오늘 칸에 넣지 않는다",
    dayWork([{ ...shared, targetMetric: "STEPS" }], "A", "2026-09-24").total === 0,
  );
  const mixed = [
    { position: 2, phase: "WARMUP", title: "준비" },
    { position: 1, phase: "COOLDOWN", title: "정리" },
    { position: Number.NaN, phase: "MAIN", title: "차례 없음" },
  ] as unknown as Parameters<typeof orderSessions>[0];
  check(
    "부모가 짠 차례대로 한다 — 준비 · 본 · 정리로 다시 줄 세우지 않는다",
    same(
      orderSessions(mixed).map((s) => s.title),
      ["정리", "준비", "차례 없음"],
    ),
  );
  // 실제 서버는 제안 · 미션에 칸을 아직 싣지 않는다 — 제안이 「0개 · 0분」, 등록한 뒤 아이 화면은 「1개 · 60분」 이었다
  const bare = {
    title: "같이 늘이는 한 주",
    targetMetric: "TIMER_MINUTES" as const,
    targetValue: 60,
    video: { videoId: "v1", startSec: 30, title: "스트레칭" },
  };
  const asProposal = proposalSessions(bare as Parameters<typeof proposalSessions>[0]);
  const asMission = sessionsOf(bare as Parameters<typeof sessionsOf>[0], "A");
  check(
    "칸이 없는 제안은 본운동 한 칸 — 등록한 미션과 같은 칸 · 같은 분",
    asProposal.length === 1 &&
      asProposal[0].phase === "MAIN" &&
      totalMinutes(asProposal) === 60 &&
      same(
        asProposal.map((s) => [s.title, s.minutes, s.clip?.videoId]),
        asMission.map((s) => [s.title, s.minutes, s.clip?.videoId]),
      ),
  );
  check(
    "칸이 오는 제안은 온 칸 그대로(차례대로)",
    same(
      proposalSessions({ ...bare, sessions: mixed } as Parameters<typeof proposalSessions>[0]).map(
        (s) => s.title,
      ),
      ["정리", "준비", "차례 없음"],
    ),
  );
}

/* ─── 운동 찾기 — 홈 영상 줄과 같은 사람의 목록 ─────────────────── */

{
  const kid = "11111111-1111-1111-1111-111111111111";
  check(
    "홈 영상 줄은 보고 있는 아이를 주소에 싣는다",
    finderHref({ factor: "유연성", profileId: kid, clipId: "abc-0" }) ===
      `/videos?phase=MAIN&factor=%EC%9C%A0%EC%97%B0%EC%84%B1&profileId=${kid}&clip=abc-0`,
  );
  check(
    "힘도 아이도 모르면 본운동만 건다",
    finderHref({ factor: null, profileId: undefined }) === "/videos?phase=MAIN",
  );
  check(
    "아이 칸과 AI 편성 화면의 직접 짜기는 그 아이를 주소에 싣는다",
    childFinderHref(kid) === `/videos?profileId=${kid}`,
  );
  check(
    "아이를 모르면 주소에 아무것도 싣지 않는다",
    childFinderHref(undefined) === "/videos" && childFinderHref("") === "/videos",
  );
  check(
    "부모 화면은 주소의 아이를 먼저 본다 — 아이를 고른 적 없이 첫째를 보던 홈에서 와도 같은 목록",
    finderOwner({ kidView: false, fromUrl: kid, childProfileId: null, self: "me" }) === kid,
  );
  check(
    "주소에 없으면 고른 아이, 그것도 없으면 나",
    finderOwner({ kidView: false, fromUrl: null, childProfileId: "c", self: "me" }) === "c" &&
      finderOwner({ kidView: false, fromUrl: null, childProfileId: null, self: "me" }) === "me",
  );
  check(
    "아이 화면은 주소를 따르지 않는다 — 다른 아이 목록으로 바뀌지 않게",
    finderOwner({ kidView: true, fromUrl: kid, childProfileId: "c", self: "me" }) === "c" &&
      finderOwner({ kidView: true, fromUrl: kid, childProfileId: null, self: "me" }) === undefined,
  );
}

/* 운동 찾기에서 다음 페이지를 이어 받기 */

{
  const a = clip("a", "MAIN");
  const b = clip("b", "MAIN");
  const c = clip("c", "WARMUP");
  check(
    "받은 페이지를 차례대로 잇는다",
    same(
      joinClipPages([{ clips: [a, b] }, { clips: [c] }]).map((x) => x.clipId),
      ["a", "b", "c"],
    ),
  );
  check(
    "다음 페이지에 같은 영상이 다시 오면 한 번만 둔다",
    same(
      joinClipPages([{ clips: [a, b] }, { clips: [b, c] }]).map((x) => x.clipId),
      ["a", "b", "c"],
    ),
  );
  check("받은 페이지가 없으면 빈 목록", joinClipPages(undefined).length === 0);
  check(
    "nextCursor 가 없으면 더 받지 않는다",
    nextCursorOf({ nextCursor: null }) === undefined &&
      nextCursorOf({}) === undefined &&
      nextCursorOf({ nextCursor: "40" }) === "40",
  );
  check("맨 위에는 영상 수를 쓴다", finderCount(128) === "영상 128개");
  check("천 개가 넘으면 쉼표를 찍는다", finderCount(1234) === "영상 1,234개");
  check(
    "기본은 나이에 맞는 것만, 켜면 모든 나이",
    finderScope({ factor: null, allAges: false }) === "모든 힘, 나이에 맞는 것만" &&
      finderScope({ factor: "유연성", allAges: true }) === "유연성, 모든 나이",
  );
  const lines = [finderCount(5), finderScope({ factor: "근력", allAges: false })];
  check(
    "새로 쓴 안내 글에 가운데 점이나 긴 대시가 없다",
    lines.every((t) => !/[·–—]/.test(t)),
    lines.join(" / "),
  );
}

/* ─── 토큰 새로 받기(401 → /auth/refresh → 다시 부르기) ───────────── */

{
  const saved = new Map<string, string>();
  const g = globalThis as unknown as {
    window?: { localStorage: Pick<Storage, "getItem" | "setItem" | "removeItem"> };
    fetch: typeof fetch;
  };
  g.window = {
    localStorage: {
      getItem: (k) => saved.get(k) ?? null,
      setItem: (k, v) => void saved.set(k, v),
      removeItem: (k) => void saved.delete(k),
    },
  };
  saved.set("ff-auth", JSON.stringify({ state: { accessToken: "old", refreshToken: "r1" } }));
  let refreshCalls = 0;
  g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      return json(200, { accessToken: "new", refreshToken: "r2" });
    }
    return auth === "Bearer new"
      ? json(200, { ok: true })
      : json(401, { error: { code: "UNAUTHORIZED", message: "expired" } });
  }) as typeof fetch;

  const { api } = await import("@/lib/api/client");
  const [a, b] = await Promise.all([
    api.get<{ ok: boolean }>("/x"),
    api.get<{ ok: boolean }>("/y"),
  ]);
  check("401 이면 새로 받아 다시 부른다", a.ok === true && b.ok === true);
  check("같이 맞아도 새로 받기는 한 번", refreshCalls === 1, `${refreshCalls}번`);
  const stored = JSON.parse(saved.get("ff-auth") ?? "{}") as {
    state?: { accessToken?: string; refreshToken?: string };
  };
  check(
    "새 토큰이 저장소에 남는다(새로고침해도 이어진다)",
    stored.state?.accessToken === "new" && stored.state?.refreshToken === "r2",
  );
  const c = await api.get<{ ok: boolean }>("/z");
  check("다음 요청은 새 토큰으로 바로 간다", c.ok === true && refreshCalls === 1);

  g.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;
  check("본문 없는 200 도 성공이다", (await api.post("/n")) === undefined);

  const { path, query } = await import("@/lib/api/client");
  check(
    "경로 값은 인코딩한다 — 「?」 로 시작해도",
    path`/missions/${"?x"}/confirm` === "/missions/%3Fx/confirm",
  );
  check(
    "query() 가 만든 조회 문자열만 그대로 붙는다",
    path`/clips${query({ q: "a b" })}` === "/clips?q=a+b" && path`/clips${query({})}` === "/clips",
  );
  let threw = false;
  try {
    void path`/families/${undefined}/missions`;
  } catch {
    threw = true;
  }
  check("빈 값이 든 경로는 부르지 않는다", threw);
}

/* ─── 보호자를 부르는 말 ─────────────────────────────────── */

check(
  "보호자 한 사람은 프로필 이름 — 엄마 · 아빠로 박지 않는다",
  callName({ name: "은영" }, "은영") === "은영",
);
check("프로필을 못 찾으면 넘겨받은 이름", callName(undefined, "도현") === "도현");
check("아무것도 모르면 「보호자」", callName(undefined, null) === "보호자");
check("보호자가 한 사람뿐이면 그 이름으로 알린다", guardiansName([{ name: "은영" }]) === "은영");
check(
  "보호자가 여럿이면 「보호자」",
  guardiansName([{ name: "은영" }, { name: "도현" }]) === "보호자",
);
check("보호자가 없으면 「보호자」", guardiansName([]) === "보호자");

/* ─── 가족이 없는 계정 ─────────────────────────────────── */

check("가족이 없으면 가족 만들기로 보낸다", familySetupPath("CREATE_FAMILY") === "/start/family");
check("초대코드로 합류하기 전이면 합류 화면으로 보낸다", familySetupPath("CLAIM") === "/claim");
check(
  "가족이 있거나 아직 모르면 보내지 않는다",
  familySetupPath("HOME") === null &&
    familySetupPath("SUPPORT_MODE") === null &&
    familySetupPath(undefined) === null,
);
check(
  "가족이 없는 계정이 부모 화면, 캘린더, 편성, 알림에 들어오면 가족 만들기로 보낸다",
  [
    "/parent",
    "/parent/dashboard",
    "/parent/family",
    "/parent/league",
    "/calendar",
    "/plan",
    "/notifications",
  ].every((p) => mustSetUpFamily({ nextStep: "CREATE_FAMILY", pathname: p }) === "/start/family"),
);
check(
  "합류 전 계정이 부모 홈에 들어오면 합류 화면으로 보낸다",
  mustSetUpFamily({ nextStep: "CLAIM", pathname: "/parent" }) === "/claim",
);
check(
  "설정은 가족이 없어도 열어 둔다",
  mustSetUpFamily({ nextStep: "CREATE_FAMILY", pathname: "/settings" }) === null &&
    mustSetUpFamily({ nextStep: "CLAIM", pathname: "/settings/support-mode" }) === null,
);
check(
  "가족이 있으면 어느 화면이든 보내지 않는다",
  mustSetUpFamily({ nextStep: "HOME", pathname: "/parent" }) === null &&
    mustSetUpFamily({ nextStep: undefined, pathname: "/parent" }) === null,
);

/* ─── 아이 없는 가족 ─────────────────────────────────── */

const parent = { role: "PARENT" as const };
const kidRow = { role: "CHILD" as const };
check(
  "보호자만 있는 가족은 아이 등록으로 보낸다",
  mustAddChild({ kidView: false, me: parent, profiles: [parent] }),
);
check(
  "아이가 한 명이라도 있으면 보내지 않는다",
  !mustAddChild({ kidView: false, me: parent, profiles: [parent, kidRow] }),
);
check(
  "가족을 아직 못 받았으면 보내지 않는다 — 받는 동안 튕기지 않게",
  !mustAddChild({ kidView: false, me: parent, profiles: undefined }),
);
check(
  "아이 화면(제 폰 쓰는 아이 · 아이 모드)은 보내지 않는다",
  !mustAddChild({ kidView: true, me: parent, profiles: [parent] }) &&
    !mustAddChild({ kidView: false, me: kidRow, profiles: [] }),
);
check(
  "설정 · 알림 · 가족 관리는 아이 없이도 열린다",
  openWithoutChild("/settings") &&
    openWithoutChild("/settings/privacy") &&
    openWithoutChild("/notifications") &&
    openWithoutChild("/parent/family"),
);
check(
  "홈 · 편성 · 캘린더 · 리그 · 운동 찾기 · 결과는 닫힌다",
  ["/parent", "/plan", "/calendar", "/parent/league", "/videos", "/p/x/result"].every(
    (p) => !openWithoutChild(p),
  ),
);

/* ─── 첫 시작 화면 차례 ─────────────────────────────────── */

{
  const signUp = onboardingSteps("family");
  check("첫 시작은 가족과 보호자 화면부터 연다", signUp[0] === "family");
  check(
    "아이 화면은 가족과 보호자 화면 뒤에 온다",
    signUp.indexOf("kid") > signUp.indexOf("family"),
  );
  check("첫 시작은 다섯 화면이다", signUp.length === 5, String(signUp.length));
  check(
    "가족과 아이는 키, 몸무게 화면을 넘길 때 함께 만든다",
    signUp.indexOf(CREATE_AT) === signUp.indexOf("kid") + 1,
  );
  const addChild = onboardingSteps("child");
  check(
    "아이 더하기는 가족 화면 없이 아이 화면부터 네 화면이다",
    addChild[0] === "kid" && !addChild.includes("family") && addChild.length === 4,
  );
  check("만 14세 보호자는 가족을 만들 수 있다", guardianOldEnough("2012-09-30", "2026-09-30"));
  check(
    "만 14세가 안 된 보호자는 가족 화면에서 넘어가지 않는다",
    !guardianOldEnough("2012-10-01", "2026-09-30"),
  );
  check("생년월일이 비면 넘어가지 않는다", !guardianOldEnough("", "2026-09-30"));

  // 가족 화면의 만 14세 안내는 생년월일 칸 밑에만 있어 360px 폰에서 「다음」 단추 영역에 가려졌다.
  // 같은 글을 단추 바로 위 안내 문구 자리에도 띄운다
  check(
    "만 14세가 안 된 보호자에게는 「가족은 만 14세부터 만들 수 있어요」",
    guardianAgeProblem("2015-03-01", "2026-09-30") === "가족은 만 14세부터 만들 수 있어요",
  );
  check(
    "만 14세 보호자에게는 안내가 없다",
    guardianAgeProblem("2012-09-30", "2026-09-30") === null,
  );
  check("생년월일이 비면 안내가 없다", guardianAgeProblem("", "2026-09-30") === null);
  check(
    "오늘 뒤의 생년월일에는 나이 안내를 띄우지 않는다",
    guardianAgeProblem("2027-01-01", "2026-09-30") === null,
  );
  const wizard = readFileSync("src/components/domain/onboarding.tsx", "utf8");
  check(
    "가족 화면의 만 14세 안내를 단추 위 안내 문구 자리(problemLine)에도 띄운다",
    /const ageProblem = step === "family" \? guardianAgeProblem\(meBirth\) : null;/.test(wizard) &&
      /const reason = problem \?\? ageProblem;/.test(wizard) &&
      /const problemLine = reason &&/.test(wizard),
  );

  // 아이 등록 요청이 화면이 그려질 때의 familyId 를 쓰면, 가족을 만든 직후 같은 흐름에서
  // /families//profiles 로 나갈 수 있었다. makeFamily 가 돌려준 familyId 로 주소를 만든다
  const queries = readFileSync("src/lib/api/queries.ts", "utf8");
  check(
    "아이 등록 요청은 부를 때 받은 familyId 로 주소를 만든다",
    /mutationFn: \(\{\s*familyId: target = familyId,\s*\.\.\.body\s*\}/.test(queries) &&
      queries.includes("path`/families/${target}/profiles`"),
  );
  check(
    "makeFamily 는 새 familyId 를 돌려주고 makeChild 는 그 값으로 아이를 만든다",
    /const made = await makeFamily\(\);/.test(wizard) &&
      /await makeChild\(made\)/.test(wizard) &&
      /createProfile\.mutateAsync\(\{\s*familyId: targetFamily,/.test(wizard),
  );
}

/* ─── 개인정보처리방침 · 이용약관 — 로그인하지 않아도 열린다 ─────────────────── */

// 구글 로그인(OAuth) 앱 심사는 로그인 전에도 볼 수 있는 곳에 두 링크를 요구한다.
// 전에는 설정(/settings/privacy · /settings/terms)에만 있어 로그인해야 들어갈 수 있었다
check("개인정보처리방침 주소는 /privacy", PRIVACY_HREF === "/privacy");
check("이용약관 주소는 /terms", TERMS_HREF === "/terms");
check(
  "두 문서는 로그인이 필요한 묶음((app) · parent · kid · plan) 밖, 앱 맨 위에 있다",
  [PRIVACY_HREF, TERMS_HREF].every(
    (href) => typeof href === "string" && existsSync(join("src/app", href, "page.tsx")),
  ),
);
{
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  const settings = readFileSync("src/app/(app)/settings/page.tsx", "utf8");
  check(
    "로그인 화면에 두 문서 링크가 있다",
    login.includes("PRIVACY_HREF") && login.includes("TERMS_HREF"),
  );
  check(
    "설정 화면도 같은 주소로 연다",
    settings.includes("PRIVACY_HREF") && settings.includes("TERMS_HREF"),
  );
}

/* ─── 공단 mp4 를 못 틀었을 때 — 같은 주소를 한 번만 다시 불러 본다 ─────────────────── */

// 공단 서버 두 대 가운데 한 대가 Content-Type 을 video/mg4 로 준다(요청마다 절반 확률).
// 다시 부르면 다른 서버가 받을 수 있으니 한 번은 다시 불러 보고, 두 번째도 안 되면 안내를 띄운다
check("처음 못 틀면 같은 주소를 다시 부른다", afterFileFailure(0) === "reload");
check("다시 불러도 못 틀면 안내를 띄운다", afterFileFailure(1) === "give-up");
check("그 뒤로는 더 부르지 않는다", afterFileFailure(2) === "give-up");
check(
  "공단 mp4 주소는 형식을 video/mp4 로 적는다",
  fileType("https://openapi.kspo.or.kr/web/video/0AUDLJ08S_00181.mp4") === "video/mp4",
);
check(
  "물음표 뒤 · 대문자 확장자도 mp4 로 본다",
  fileType("https://x.test/a.MP4?t=1#frag") === "video/mp4",
);
check("mp4 가 아니면 형식을 적지 않는다", fileType("https://x.test/a.webm") === undefined);
check("주소가 이상해도 멈추지 않는다", fileType("not a url") === undefined);

/* ─── 공단 mp4 는 앱 안 영상 화면(/watch)으로 연다 ─────────────────── */

// 공단 서버 한 대가 Content-Type 을 video/mg4 로 주면, 주소를 새 창으로 바로 연 브라우저는 영상인 줄 몰라
// 파일로 내려받는다. 앱 안 <video> 는 파일 내용을 보고 튼다 — 그래서 mp4 는 /watch 에서 <video> 로 튼다
{
  const mp4 = "https://openapi.kspo.or.kr/web/video/0AUDLJ08S_00589.mp4";
  const youtube = "https://www.youtube.com/watch?v=IdpXx2gm90o&t=96s";
  check("공단 영상 주소는 받는다", kspoVideo(mp4) === mp4);
  check(
    "공단 영상이 아닌 주소는 /watch 가 틀지 않는다 — 아무 주소나 넣어 여는 창이 되지 않게",
    [
      "http://openapi.kspo.or.kr/web/video/a.mp4",
      "https://openapi.kspo.or.kr.evil.test/web/video/a.mp4",
      "https://evil.test/web/video/a.mp4",
      "https://evil.test/?u=https://openapi.kspo.or.kr/web/video/a.mp4",
      "https://openapi.kspo.or.kr/web/image/a/a.jpeg",
      "https://openapi.kspo.or.kr/web/video/../../evil.mp4",
      "https://openapi.kspo.or.kr/web/video/%2e%2e/%2e%2e/evil.mp4",
      "https://user@openapi.kspo.or.kr/web/video/a.mp4",
      "https://openapi.kspo.or.kr:8443/web/video/a.mp4",
      "https://openapi.kspo.or.kr/web/video/",
      "javascript:alert(1)",
      "not a url",
      "",
      null,
      undefined,
    ].every((u) => kspoVideo(u) === undefined),
  );
  const href = watchHref(mp4, "넙다리 뒤쪽 스트레칭");
  const q = new URLSearchParams(href?.split("?")[1] ?? "");
  check(
    "공단 영상은 /watch?src=…&title=… 로 연다",
    Boolean(href?.startsWith("/watch?")) &&
      q.get("src") === mp4 &&
      q.get("title") === "넙다리 뒤쪽 스트레칭",
    href,
  );
  check("유튜브 주소는 /watch 로 열지 않는다", watchHref(youtube, "x") === undefined);
  check(
    "근거 링크 — 공단 영상은 앱 안, 유튜브는 지금처럼 밖으로",
    videoLink(mp4, "t")?.inApp === true &&
      videoLink(mp4, "t")?.href === href?.replace(/title=[^&]*/, "title=t") &&
      same(videoLink(youtube, "t"), { href: youtube, inApp: false }),
  );
  check(
    "근거 링크 — 걸러야 할 주소 · 빈 주소는 링크를 만들지 않는다",
    videoLink("javascript:alert(1)", "t") === undefined && videoLink(null, "t") === undefined,
  );
  check("영상 화면 제목이 없으면 「시범 영상」", watchTitle(null) === "시범 영상");
  check("영상 화면 제목은 앞뒤 빈칸을 뺀다", watchTitle("  넙다리 ") === "넙다리");
  check(
    "영상 화면 제목은 주소로 들어오니 길이를 자른다",
    watchTitle("가".repeat(500)).length === WATCH_TITLE_MAX,
  );
  check("영상 화면은 로그인 없이 열리는 앱 맨 위에 있다", existsSync("src/app/watch/page.tsx"));
  const player = readFileSync("src/components/domain/clip-player.tsx", "utf8");
  const citations = readFileSync("src/components/domain/citations.tsx", "utf8");
  check(
    "재생 실패 안내의 「새 창으로 열기」 는 공단 mp4 를 바로 열지 않는다",
    player.includes("watchHref(") && !/PlayFailed href=\{src\}/.test(player),
  );
  check("근거 링크는 videoLink 로 고른다", citations.includes("videoLink("));
}

/* ─── 심사용 계정 — 세 흐름 ─────────────────────────────── */

check(
  "심사용 계정은 체험 가족 · 처음 가입 · 초대받은 보호자 셋 가운데 고른다",
  same(
    REVIEW_WAYS.map((w) => w.kind),
    ["FAMILY", "FRESH", "INVITED"],
  ),
);
check(
  "세 줄 모두 제목과 한 줄 설명이 있다",
  REVIEW_WAYS.every((w) => w.title.trim() && w.description.trim()),
);
check("체험 가족은 홈으로", reviewDestination({ nextStep: "HOME" }) === "/");
check(
  "처음 가입은 스플래시가 가족 만들기로 보낸다",
  reviewDestination({ nextStep: "CREATE_FAMILY" }) === "/",
);
check(
  "초대받은 보호자는 받은 초대코드를 채운 합류 화면으로",
  reviewDestination({ nextStep: "CREATE_FAMILY", inviteCode: "K7M2QT" }) === "/claim?code=K7M2QT",
);
check(
  "서버가 CLAIM 을 줘도 같은 합류 화면으로",
  reviewDestination({ nextStep: "CLAIM", inviteCode: "K7M2QT" }) === "/claim?code=K7M2QT",
);
check(
  "초대코드는 주소에 맞게 싸서 붙인다",
  reviewDestination({ nextStep: "CLAIM", inviteCode: "A B&" }) === "/claim?code=A%20B%26",
);
check(
  "이미 가족에 붙었으면(홈 · 참여 방식) 코드가 있어도 합류 화면으로 가지 않는다",
  afterSignIn({ nextStep: "HOME" }, "K7M2QT") === "/" &&
    afterSignIn({ nextStep: "SUPPORT_MODE" }, "K7M2QT") === "/",
);
{
  const page = readFileSync("src/app/login/page.tsx", "utf8");
  check(
    "로그인 화면의 「심사용 계정으로 둘러보기」 는 고르는 시트를 열고 kind 를 보낸다",
    page.includes("REVIEW_WAYS") && page.includes("reviewLogin.mutateAsync(kind)"),
  );
  check("개발용 로그인 묶음은 그대로 둔다", page.includes("개발용으로 구글 없이 들어가기"));
}

/* ─── 키울 요인을 부르는 두 이름(결정 7) ─────────────────── */

check(
  "측정으로 고른 요인은 「지금 키우기 좋은 영역」",
  BAND_COPY.growth === "지금 키우기 좋은 영역",
);
check(
  "보호자가 고른 요인은 「보호자가 키워 주고 싶은 역량」",
  FOCUS_COPY === "보호자가 키워 주고 싶은 역량",
);
{
  // 편성 화면 카드 제목이 「보호자가」 를 뺀 「키워 주고 싶은 역량」 이었다
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? files(join(dir, e.name))
        : /\.tsx?$/.test(e.name)
          ? [join(dir, e.name)]
          : [],
    );
  const bare = files("src/app")
    .concat(files("src/components"))
    .filter((f) => /(?<!보호자가 )키워 주고 싶은 역량/.test(readFileSync(f, "utf8")));
  check(
    "화면에 「보호자가」 없이 「키워 주고 싶은 역량」 만 쓴 곳이 없다",
    bare.length === 0,
    bare.join(", "),
  );
}

/* ─── 날짜 고르기: 범위와 표시 ─────────────────────────────── */
{
  check(
    "2018-03-05 를 「2018년 3월 5일」 로 적는다",
    koreanDate("2018-03-05") === "2018년 3월 5일",
  );
  check("틀린 날짜는 그대로 돌려준다", koreanDate("2018-02-30") === "2018-02-30");
  check("빈 값은 날짜로 읽지 않는다", parseDate("") === undefined);
  const march = parseDate("2018-03-05");
  check(
    "YYYY-MM-DD 를 기기 시간대 자정으로 읽는다",
    !!march &&
      march.getFullYear() === 2018 &&
      march.getMonth() === 2 &&
      march.getDate() === 5 &&
      march.getHours() === 0,
  );
  check("윤일에서 8년 전은 윤년이면 같은 날", yearsBefore(8, "2024-02-29") === "2016-02-29");
  check("윤일에서 1년 전은 2월 28일", yearsBefore(1, "2024-02-29") === "2023-02-28");

  const on = "2026-09-30";
  const kid = childBirthRule(on);
  check(
    "아이 생일은 가입 폼과 같이 365*19+5일 전부터 오늘까지",
    kid.min === daysBefore(365 * 19 + 5, on) && kid.max === on,
    JSON.stringify(kid),
  );
  check("아이 생일 달력은 8년 전 달에서 열린다", openingDate(kid, "") === "2018-09-30");
  check("고른 생일이 있으면 그 달에서 열린다", openingDate(kid, "2015-01-02") === "2015-01-02");
  check("범위 밖 값이면 처음 보여 줄 달로 연다", openingDate(kid, "1990-01-01") === "2018-09-30");
  check("아이 생일에 내일은 고를 수 없다", !inRule(kid, daysBefore(-1, on)));
  check("아이 생일에 20년 전은 고를 수 없다", !inRule(kid, "2006-09-30"));

  const guardian = guardianBirthRule(on);
  check(
    "보호자 생일은 100년 전부터 오늘까지",
    guardian.min === "1926-09-30" && guardian.max === on,
  );
  check("보호자 생일 달력은 35년 전 달에서 열린다", openingDate(guardian, "") === "1991-09-30");

  const measured = measuredRule(on);
  check("측정 날짜는 오늘까지, 5년 전부터", measured.max === on && measured.min === "2021-09-30");
  check("측정 날짜 달력은 이번 달에서 열린다", openingDate(measured, "") === on);
  check("측정 날짜에 미래는 고를 수 없다", !inRule(measured, "2026-10-01"));
  check("측정 날짜에 오늘은 고를 수 있다", inRule(measured, on));
}

// 달 마지막 날에 「0일 남았어요」 가 아니라 「오늘 끝나요」
check("리그가 오늘 끝나면 오늘 끝나요", daysLeftText(0) === "오늘 끝나요", daysLeftText(0));
check("리그가 하루 남으면 1일 남았어요", daysLeftText(1) === "1일 남았어요", daysLeftText(1));
check("리그가 열흘 남으면 10일 남았어요", daysLeftText(10) === "10일 남았어요", daysLeftText(10));

// 만 7~10세는 또래 분포 표가 비어 백분위가 모두 없다. 칸마다 「없어요」 대신 까닭을 한 줄로
{
  const note = noPeerNormsNote({ ageGroup: "유소년", measured: true, compared: false });
  check(
    "쟀는데 또래 백분위가 하나도 없는 유소년은 까닭을 말한다",
    note === NO_PEER_NORMS_NOTE && note.includes("만 7~10세"),
    String(note),
  );
  check(
    "백분위가 하나라도 있으면 까닭을 말하지 않는다",
    noPeerNormsNote({ ageGroup: "유소년", measured: true, compared: true }) === null,
  );
  check(
    "아직 안 쟀으면 까닭을 말하지 않는다",
    noPeerNormsNote({ ageGroup: "유소년", measured: false, compared: false }) === null,
  );
  check(
    "유소년이 아니면 만 7~10세 까닭을 말하지 않는다",
    noPeerNormsNote({ ageGroup: "유아기", measured: true, compared: false }) === null &&
      noPeerNormsNote({ ageGroup: undefined, measured: true, compared: false }) === null,
  );
}

// 부모 홈 아래쪽 아이 칸도 위쪽 카드와 같은 가족 지도 값으로 까닭을 정한다
{
  const kid = {
    ageGroup: "유소년" as const,
    latest: { testedOn: "2026-09-30", overallPercentile: null },
  };
  check(
    "가족 지도에서 쟀는데 점수가 없는 유소년은 까닭을 말한다",
    memberNoPeerNormsNote(kid) === NO_PEER_NORMS_NOTE,
    String(memberNoPeerNormsNote(kid)),
  );
  check(
    "가족 지도에 측정일이 없어도 따로 받은 측정일이 있으면 까닭을 말한다",
    memberNoPeerNormsNote({ ageGroup: "유소년", latest: null }, "2026-09-30") ===
      NO_PEER_NORMS_NOTE,
  );
  check(
    "가족 지도에 점수가 있으면 까닭을 말하지 않는다",
    memberNoPeerNormsNote({
      ageGroup: "유소년",
      latest: { testedOn: "2026-09-30", overallPercentile: 40 },
    }) === null,
  );
}

// 운동 짜기 화면 위쪽 육각형도 부모 홈과 같은 까닭을 받는다. 안 넘기면 「없어요」 여섯 칸이 남는다
{
  const plan = readFileSync("src/app/plan/page.tsx", "utf8");
  check(
    "운동 짜기 화면 육각형도 만 7~10세 까닭을 받는다",
    /<FactorRadar[^>]*note=\{memberNoPeerNormsNote\(kid\)\}/.test(plan),
  );
}

// 칸은 영상을 튼 채 잡힌 시간만큼 하면 끝난다. 시범 영상이 짧아 되풀이돼도 「끝까지 봤다」 고 하지 않는다
check(
  "영상 재생 시간으로 인정한 칸은 끝까지 봤다고 말하지 않는다",
  !VERIFIED_COPY.VIDEO_PROGRESS.includes("끝까지"),
  VERIFIED_COPY.VIDEO_PROGRESS,
);

/* ─── 계정 탈퇴: 누가 탈퇴하는지에 따라 안내가 다르다 ─────────────────── */

{
  const owner = { profileId: "mom", role: "PARENT" as const, isOwner: true };
  const guardian = { profileId: "dad", role: "PARENT" as const, isOwner: false };
  const child = { profileId: "kid", role: "CHILD" as const, isOwner: false };

  check(
    "프로필이 없는 계정은 가족이 없는 계정이다",
    withdrawalCase({ me: undefined, members: undefined }) === "NO_FAMILY",
  );
  check(
    "아이 본인 계정은 아이 안내를 받는다",
    withdrawalCase({ me: child, members: [owner, child] }) === "CHILD",
  );
  check(
    "오너가 아닌 보호자는 보호자 안내를 받는다",
    withdrawalCase({ me: guardian, members: [owner, guardian, child] }) === "GUARDIAN",
  );
  check(
    "다른 구성원이 있는 오너는 먼저 내보내라는 안내를 받는다",
    withdrawalCase({ me: owner, members: [owner, child] }) === "OWNER_WITH_MEMBERS",
  );
  check(
    "혼자 남은 오너는 가족까지 지워진다는 안내를 받는다",
    withdrawalCase({ me: owner, members: [owner] }) === "OWNER_ALONE",
  );
  check(
    "가족 목록을 아직 못 받은 오너는 서버에 맡긴다",
    withdrawalCase({ me: owner, members: undefined }) === "OWNER_ALONE",
  );
  check(
    "서버가 FAMILY_NOT_EMPTY 로 돌려보내면 받아 둔 목록이 혼자여도 오너 안내로 바꾼다",
    withdrawalCase({ me: owner, members: [owner], familyNotEmpty: true }) === "OWNER_WITH_MEMBERS",
  );

  const blocked = WITHDRAWAL_COPY.OWNER_WITH_MEMBERS;
  check("다른 구성원이 남은 오너에게는 탈퇴 버튼이 없다", blocked.canWithdraw === false);
  check(
    "다른 구성원이 남은 오너에게 가족 관리에서 내보낸 뒤 탈퇴하라고 말한다",
    blocked.lines.includes("가족 관리에서 다른 구성원을 모두 내보낸 뒤에 탈퇴할 수 있어요"),
  );
  check(
    "나머지 경우는 모두 탈퇴할 수 있다",
    (["NO_FAMILY", "CHILD", "GUARDIAN", "OWNER_ALONE"] as const).every(
      (c) => WITHDRAWAL_COPY[c].canWithdraw,
    ),
  );
  check(
    "혼자 남은 오너에게 가족 정보도 지워지고 되돌릴 수 없다고 말한다",
    WITHDRAWAL_COPY.OWNER_ALONE.lines.some((l) => l.includes("가족 정보")) &&
      WITHDRAWAL_COPY.OWNER_ALONE.lines.some((l) => l.includes("되돌릴 수 없어요")),
  );
  check(
    "오너가 아닌 보호자에게 가족과 아이 기록은 남는다고 말한다",
    WITHDRAWAL_COPY.GUARDIAN.lines.some((l) => l.includes("가족과 아이 기록은 그대로 남아요")),
  );
  const allCopy = [
    ...Object.values(WITHDRAWAL_COPY).flatMap((c) => [c.title, ...c.lines]),
    WITHDRAWN_NOTICE,
  ];
  check(
    "탈퇴 안내 글에 가운데 점과 긴 대시를 쓰지 않는다",
    allCopy.every((l) => !/[·—–]/.test(l)),
    allCopy.filter((l) => /[·—–]/.test(l)).join(" / "),
  );
  check("탈퇴하면 로그인 화면으로 보낸다", WITHDRAWN_PATH.startsWith("/login?"));
  check(
    "탈퇴하고 온 로그인 화면만 탈퇴 안내를 띄운다",
    cameAfterWithdrawal(new URLSearchParams(WITHDRAWN_PATH.split("?")[1])) &&
      !cameAfterWithdrawal(new URLSearchParams("")) &&
      !cameAfterWithdrawal(new URLSearchParams("claimCode=K7M2QT")),
  );
}

/* ─── 구성원 내보내기: 가족을 만든 사람만 다른 구성원을 내보낸다 ─────────────────── */

{
  const owner = { profileId: "mom", isOwner: true };
  const guardian = { profileId: "dad", isOwner: false };
  const kid = { profileId: "kid", name: "서준", hasAccount: false };
  const dad = { profileId: "dad", name: "도현", hasAccount: true };

  check(
    "오너는 다른 구성원을 내보낼 수 있다",
    canRemoveMember(owner, kid) && canRemoveMember(owner, dad),
  );
  check("오너도 자기 자신은 내보낼 수 없다", !canRemoveMember(owner, { profileId: "mom" }));
  check("오너가 아니면 아무도 내보낼 수 없다", !canRemoveMember(guardian, kid));
  check("내 프로필을 모르면 내보낼 수 없다", !canRemoveMember(undefined, kid));
  check(
    "프로필 번호가 없는 줄은 내보낼 수 없다",
    !canRemoveMember(owner, { profileId: undefined }),
  );

  const kidCopy = removeMemberCopy(kid);
  check(
    "확인 제목은 이름에 맞는 조사로 묻는다",
    kidCopy.title === "서준을 내보낼까요",
    kidCopy.title,
  );
  check(
    "내보내면 그 사람의 기록이 모두 지워지고 되돌릴 수 없다고 말한다",
    kidCopy.lines.some((l) => l.includes("서준의 기록이 모두 지워져요")) &&
      kidCopy.lines.some((l) => l.includes("되돌릴 수 없어요")),
    kidCopy.lines.join(" / "),
  );
  check(
    "계정이 없는 사람에게는 계정 이야기를 하지 않는다",
    kidCopy.lines.every((l) => !l.includes("계정")),
  );
  const dadCopy = removeMemberCopy(dad);
  check(
    "받침 없는 이름도 조사를 맞춘다",
    removeMemberCopy({ name: "지호" }).title === "지호를 내보낼까요",
  );
  check(
    "계정이 있는 사람이면 계정은 남고 가족에서만 빠진다고 말한다",
    dadCopy.lines.some((l) => l.includes("도현의 계정은 지워지지 않고 우리 가족에서만 빠져요")),
    dadCopy.lines.join(" / "),
  );
  check(
    "이름이 없으면 「이 구성원」 으로 부른다",
    removeMemberCopy({}).title === "이 구성원을 내보낼까요",
  );
  const all = [kidCopy, dadCopy].flatMap((c) => [c.title, ...c.lines]);
  check(
    "내보내기 안내 글에 가운데 점과 긴 대시를 쓰지 않는다",
    all.every((l) => !/[·—–]/.test(l)),
  );
}

/* ─── 약관과 방침의 탈퇴 문구가 탈퇴 규칙과 같다 ─────────────────── */

{
  const section = (doc: typeof TERMS_OF_SERVICE, heading: string) =>
    doc.sections.find((s) => s.heading === heading)?.lines ?? [];
  const terms = section(TERMS_OF_SERVICE, "탈퇴");
  const keep = section(PRIVACY_POLICY, "보관과 파기");
  check(
    "약관은 언제든 탈퇴할 수 있고 그 사람의 정보를 바로 지운다고 말한다",
    terms.some((l) => l.includes("언제든 탈퇴할 수 있어요")) &&
      terms.some((l) => l.includes("그 사람의 정보를 바로 지워요")),
    terms.join(" / "),
  );
  check(
    "약관은 가족을 만든 사람이 다른 구성원을 내보낸 뒤 탈퇴하고 그때 가족 정보도 지운다고 말한다",
    terms.some(
      (l) => l.includes("다른 구성원을 모두 내보낸 뒤") && l.includes("가족 정보도 지워요"),
    ),
  );
  check(
    "약관은 한 사람이 탈퇴해도 가족의 정보를 모두 지운다고 말하지 않는다",
    terms.every((l) => !l.includes("가족의 정보를 지워요")),
  );
  check(
    "방침의 보관과 파기는 내보낸 구성원의 정보도 바로 지운다고 말한다",
    keep.some((l) => l.includes("내보낸 구성원의 정보도 바로 지워요")) &&
      terms.some((l) => l.includes("내보낸 구성원의 정보도 바로 지워요")),
    keep.join(" / "),
  );
  check(
    "탈퇴 문구에 가운데 점과 긴 대시를 쓰지 않는다",
    [...terms, ...keep].every((l) => !/[·—–]/.test(l)),
  );
}

console.log(failed === 0 ? "\n전부 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
