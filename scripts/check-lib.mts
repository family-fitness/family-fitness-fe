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
  isOpenMonth,
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
  NEW_ACCOUNT_CHOICES,
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

import {
  CONSENT_TERMS,
  PRIVACY_HREF,
  PRIVACY_POLICY,
  TERMS_HREF,
  TERMS_OF_SERVICE,
} from "@/lib/legal";
import { verifiedLabel } from "@/lib/mission";
import {
  REVIEW_WAYS,
  UNUSED_INVITE_COPY,
  afterSignIn,
  reviewDestination,
  unusedInvite,
} from "@/lib/review-login";
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
import { homeOf, modeFor } from "@/lib/role-mode";

import { ApiError } from "@/lib/api/client";
import {
  CLAIM_ERROR_COPY,
  INVITE_ROLE_NAME,
  blocksClaim,
  claimBody,
  claimErrorMessage,
  familyInviteBody,
  inviteBirthRule,
  inviteCodeTitle,
  inviteLink,
  invitePeekLine,
  inviteShareText,
  isFamilyInvite,
  joinButtonLabel,
  joinProblem,
  joinReady,
  normalizeCode,
  pendingInviteDetail,
  pendingInviteTitle,
} from "@/lib/invite";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BAND_COPY, FOCUS_COPY } from "@/lib/api/types";
import { MEMO_MAX, oneLine } from "@/lib/stickers";
import { aloneKids, aloneNotice, sharedDays, togetherBlock } from "@/lib/schedule";
import type { AvailabilitySlot, Weekday } from "@/lib/api/types";

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
check(
  "직접 적은 기록 — 부모가 확인하면 확인함, 모르면 확인 필요(확인된 척하지 않는다)",
  verifiedLabel("SELF_REPORT", false) === "직접 적었어요(부모 확인함)" &&
    verifiedLabel("SELF_REPORT", true) === "직접 적었어요(부모 확인 필요)" &&
    verifiedLabel("SELF_REPORT", undefined) === "직접 적었어요(부모 확인 필요)" &&
    verifiedLabel("TIMER", false) === "타이머로 확인했어요",
);
check(
  "캘린더가 보여 줄 달 — 2020년 1월부터 다음 달까지, 그 밖(0000-01 · 2031-01)은 아니다",
  isOpenMonth("2026-10", "2026-09-30") &&
    isOpenMonth("2020-01", "2026-09-30") &&
    !isOpenMonth("2026-11", "2026-09-30") &&
    !isOpenMonth("0000-01", "2026-09-30") &&
    !isOpenMonth("2031-01", "2026-09-30") &&
    !isOpenMonth("2026-13", "2026-09-30") &&
    isOpenMonth("2027-01", "2026-12-15"),
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

check(
  "가족이 없는 새 계정은 가족 만들기로 곧장 가지 않고 시작을 고르는 화면으로",
  familySetupPath("CREATE_FAMILY") === "/start/welcome",
);
check(
  "시작을 고르는 화면은 새 가족 만들기와 초대 코드로 참여하기 둘이다",
  same(
    NEW_ACCOUNT_CHOICES.map((c) => [c.title, c.href]),
    [
      ["새 가족 만들기", "/start/family"],
      ["초대 코드로 참여하기", "/claim"],
    ],
  ) &&
    NEW_ACCOUNT_CHOICES.every((c) => c.description.trim() !== "" && !/[·—–]/.test(c.description)),
);
check("시작을 고르는 화면이 있다", existsSync("src/app/start/welcome/page.tsx"));
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
  ].every((p) => mustSetUpFamily({ nextStep: "CREATE_FAMILY", pathname: p }) === "/start/welcome"),
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
  check(
    "로그인 화면에 초대 코드로 시작하는 입구가 있고, 넣은 코드를 들고 구글 로그인으로 간다",
    page.includes("초대 코드가 있어요") &&
      page.includes("useInvitePeek") &&
      page.includes("start(entered)"),
  );
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

// 약관과 방침은 조문 틀이다(담당자 c2440b9). 조 이름으로 찾아 그 조의 글(항과 호)을 한 줄씩 본다
{
  const lines = (doc: typeof TERMS_OF_SERVICE, title: string) =>
    (doc.articles.find((a) => a.title === title)?.body ?? []).flatMap((b) =>
      typeof b === "string"
        ? [b]
        : "items" in b
          ? b.items
          : b.rows.map((r) => `${r.label} ${r.text}`),
    );
  const terms = lines(TERMS_OF_SERVICE, "이용계약의 해지");
  const keep = lines(PRIVACY_POLICY, "개인정보의 파기 절차 및 방법");
  check(
    "약관은 설정의 계정 탈퇴에서 언제든 탈퇴할 수 있고 그 회원의 정보를 지체 없이 파기한다고 말한다",
    terms.some((l) => l.includes("언제든지 설정의 계정 탈퇴에서")) &&
      terms.some((l) => l.includes("그 회원의 정보를 지체 없이 파기")),
    terms.join(" / "),
  );
  check(
    "약관은 가족을 만든 회원이 다른 구성원을 모두 내보낸 뒤 탈퇴하고 그때 가족 정보도 파기한다고 말한다",
    terms.some(
      (l) => l.includes("다른 구성원을 모두 내보낸 뒤") && l.includes("가족의 정보도 함께 파기"),
    ),
  );
  check(
    "약관은 다른 보호자가 없다고 가족과 자녀 정보를 함께 지운다고 말하지 않는다(가족을 만든 회원만 가족을 지운다)",
    terms.every((l) => !l.includes("다른 보호자가 없으면")),
  );
  check(
    "방침의 파기와 약관의 해지는 내보낸 구성원의 정보도 지체 없이 파기한다고 말한다",
    keep.some((l) => l.includes("내보낸 구성원의 개인정보도 지체 없이 파기")) &&
      terms.some((l) => l.includes("내보낸 구성원의 정보도 지체 없이 파기")),
    keep.join(" / "),
  );
  check(
    "방침의 파기는 탈퇴하면 그 회원의 개인정보를 지체 없이 파기한다고 말한다",
    keep.some((l) => l.includes("탈퇴하면 운영자는 그 회원의 개인정보를 지체 없이 파기")),
  );
  check(
    "약관과 방침은 로그인 화면에서도 볼 수 있다고 적는다(/privacy, /terms)",
    (TERMS_OF_SERVICE.articles.find((a) => a.title === "약관의 게시와 개정")?.body ?? []).some(
      (b) => typeof b === "string" && b.includes("로그인 화면과 설정 화면"),
    ) && (PRIVACY_POLICY.preamble ?? "").includes("로그인 화면과 설정 화면"),
  );
}

/* ─── 약관, 방침, 동의서는 화면 글이다. 가운데 점과 긴 대시를 쓰지 않는다 ─────────────────── */

{
  const blockText = (
    b: string | { items: string[] } | { rows: { label: string; text: string }[] },
  ) =>
    typeof b === "string" ? [b] : "items" in b ? b.items : b.rows.flatMap((r) => [r.label, r.text]);
  const docText = (doc: typeof TERMS_OF_SERVICE) => [
    doc.title,
    doc.preamble ?? "",
    ...doc.articles.flatMap((a) => [a.title, ...a.body.flatMap(blockText)]),
    ...(doc.addendum ?? []),
  ];
  const consentText = Object.values(CONSENT_TERMS).flatMap((c) => [
    c.title,
    c.lead,
    c.refusal,
    ...c.rows.flatMap((r) => [r.label, r.text]),
  ]);
  const all = [...docText(PRIVACY_POLICY), ...docText(TERMS_OF_SERVICE), ...consentText];
  const bad = all.filter((l) => /[·—–]/.test(l));
  check("약관, 방침, 동의서 글에 가운데 점과 긴 대시가 없다", bad.length === 0, bad[0]);
}

/* ─── 약관 · 방침 — 글 안에서 조 번호로 서로 가리키는 곳. 조를 넣거나 빼면 번호가 밀린다 ─── */
{
  const article = (doc: { articles: { title: string }[] }, n: number) =>
    doc.articles[n - 1]?.title ?? "";
  check(
    "건강정보 동의가 가리키는 방침 제7조는 국외 이전",
    article(PRIVACY_POLICY, 7).includes("국외 이전") &&
      CONSENT_TERMS.health.rows.some((r) => r.text.includes("개인정보처리방침 제7조")),
  );
  check(
    "방침 제9조가 가리키는 방침 제12조는 개인정보 보호책임자",
    article(PRIVACY_POLICY, 12) === "개인정보 보호책임자",
  );
  check(
    "방침 제5조가 가리키는 제1조는 처리 목적",
    article(PRIVACY_POLICY, 1) === "개인정보의 처리 목적",
  );
  check(
    "약관 제11조 · 제12조가 가리키는 제8조는 회원의 의무 · 제9조는 측정 결과와 운동",
    article(TERMS_OF_SERVICE, 8) === "회원의 의무" &&
      article(TERMS_OF_SERVICE, 9) === "측정 결과와 운동의 성격",
  );
}

/* ─── 칭찬 한마디는 한 덩어리 글이다 ─────────────────── */

check("한마디의 줄바꿈은 띄어쓰기 하나로 바꾼다", oneLine("최고야\n사랑해") === "최고야 사랑해");
check(
  "붙여 넣은 글의 줄바꿈 여러 개도 띄어쓰기 하나로",
  oneLine("오늘도\r\n\n잘했어") === "오늘도 잘했어",
  JSON.stringify(oneLine("오늘도\r\n\n잘했어")),
);
check("줄바꿈이 없으면 그대로 둔다", oneLine("끝까지 했네 ") === "끝까지 했네 ");
check("한마디는 서버가 받는 길이(100자) 안이다", MEMO_MAX > 0 && MEMO_MAX <= 100);

/* ─── 운동 시간표가 겹치는 요일 ─────────────────── */

{
  const week = (...days: Weekday[]): AvailabilitySlot[] =>
    days.map((day) => ({ day, start: "19:00", minutes: 20 }));
  const weekdays = week("MON", "TUE", "WED", "THU", "FRI");
  const weekend = week("SAT", "SUN");
  const kid = { name: "서준", slots: week("MON", "WED", "FRI", "SAT") };
  const mom = { name: "은영", slots: week("SAT") };
  const dad = { name: "도현", slots: week("SUN") };
  const blank = { name: "지호", slots: [] };

  check(
    "평일만인 아이와 주말만인 보호자는 겹치는 요일이 없다",
    same(sharedDays([weekdays, weekend]), []),
  );
  check("겹치는 요일만 남긴다", same(sharedDays([kid.slots, mom.slots]), ["SAT"]));
  check(
    "셋이 고르면 셋 모두 적어 둔 요일만",
    same(sharedDays([weekdays, week("MON", "TUE", "SAT"), week("TUE", "MON")]), ["MON", "TUE"]),
  );
  check(
    "시간표를 아예 비워 둔 사람은 빼고 본다",
    same(sharedDays([kid.slots, []]), ["MON", "WED", "FRI", "SAT"]),
  );
  check("모두 비워 뒀으면 겹치는 요일이 없다", same(sharedDays([[], []]), []));
  check("아무도 안 골랐으면 겹치는 요일이 없다", same(sharedDays([]), []));
  check(
    "요일은 월요일부터 차례대로",
    same(sharedDays([week("SUN", "MON", "FRI"), week("FRI", "SUN", "MON")]), ["MON", "FRI", "SUN"]),
  );

  check("둘 다 적어 둔 요일이면 같이 할 수 있다", togetherBlock("SAT", kid, mom) === null);
  check(
    "보호자가 그 요일을 적어 두지 않았으면 보호자 이름으로 막는다",
    togetherBlock("MON", kid, dad) ===
      "월요일은 도현이 운동할 수 있는 날이 아니라서 같이 할 수 없어요",
    String(togetherBlock("MON", kid, dad)),
  );
  check(
    "아이가 그 요일을 적어 두지 않았으면 아이 이름으로 막는다",
    togetherBlock("SUN", kid, dad) ===
      "일요일은 서준이 운동할 수 있는 날이 아니라서 같이 할 수 없어요",
    String(togetherBlock("SUN", kid, dad)),
  );
  check(
    "둘 다 아니면 둘 다 부른다",
    togetherBlock("THU", kid, mom) ===
      "목요일은 서준과 은영이 운동할 수 있는 날이 아니라서 같이 할 수 없어요",
    String(togetherBlock("THU", kid, mom)),
  );
  check(
    "받침 없는 이름에도 조사를 맞춘다",
    togetherBlock("MON", { name: "지호", slots: weekend }, { name: "아빠", slots: weekend }) ===
      "월요일은 지호와 아빠가 운동할 수 있는 날이 아니라서 같이 할 수 없어요",
    String(
      togetherBlock("MON", { name: "지호", slots: weekend }, { name: "아빠", slots: weekend }),
    ),
  );
  check(
    "보호자 시간표가 아예 비어 있으면 막지 않는다",
    togetherBlock("THU", kid, { name: "도현", slots: [] }) === null,
  );
  check(
    "아이 시간표가 아예 비어 있으면 보호자 시간표만 본다",
    togetherBlock("SAT", blank, mom) === null &&
      togetherBlock("MON", blank, mom) ===
        "월요일은 은영이 운동할 수 있는 날이 아니라서 같이 할 수 없어요",
    String(togetherBlock("MON", blank, mom)),
  );

  check("한 보호자와라도 겹치면 혼자인 아이가 아니다", same(aloneKids([kid], [mom, dad]), []));
  check(
    "어떤 보호자와도 겹치는 요일이 없는 아이를 찾는다",
    same(aloneKids([kid, { name: "지우", slots: weekdays }], [mom, dad]), ["지우"]),
  );
  check(
    "보호자 시간표가 하나라도 비어 있으면 그 보호자와는 막히지 않는다",
    same(aloneKids([{ name: "지우", slots: weekdays }], [dad, { name: "은영", slots: [] }]), []),
  );
  check("시간표를 비워 둔 아이는 찾지 않는다", same(aloneKids([blank], [mom, dad]), []));
  check("보호자가 없으면 찾지 않는다", same(aloneKids([kid], []), []));

  check(
    "겹치는 요일이 없는 아이를 이름으로 알린다",
    aloneNotice(["서준"]) ===
      "서준과 보호자가 겹치는 요일이 없어요. 같이 운동하려면 요일을 하나 이상 맞춰 주세요",
    String(aloneNotice(["서준"])),
  );
  check(
    "아이가 여럿이면 쉼표로 잇는다",
    aloneNotice(["서준", "지호"]) ===
      "서준, 지호와 보호자가 겹치는 요일이 없어요. 같이 운동하려면 요일을 하나 이상 맞춰 주세요",
    String(aloneNotice(["서준", "지호"])),
  );
  check("모두 겹치면 알리지 않는다", aloneNotice([]) === null);
  const lines = [
    togetherBlock("THU", kid, mom),
    togetherBlock("MON", kid, dad),
    aloneNotice(["서준", "지호"]),
  ];
  check(
    "시간표 안내 글에 가운데 점과 긴 대시를 쓰지 않는다",
    lines.every((l) => l !== null && !/[·—–]/.test(l)),
  );
}

/* ─── 가족 초대 코드 만들기 ─────────────────────────────── */

check(
  "초대할 역할은 보호자와 아이 둘이다",
  INVITE_ROLE_NAME.PARENT === "보호자" && INVITE_ROLE_NAME.CHILD === "아이",
);
check(
  "보호자 초대는 역할만 보낸다(동의 칸을 싣지 않는다)",
  same(familyInviteBody("PARENT", { personalData: false, healthData: false }), {
    role: "PARENT",
  }),
);
check(
  "아이 초대는 동의를 하나라도 안 했으면 만들지 않는다",
  familyInviteBody("CHILD", { personalData: true, healthData: false }) === null &&
    familyInviteBody("CHILD", { personalData: false, healthData: true }) === null,
);
check(
  "아이 초대는 아이 등록과 같은 보호자 동의를 함께 보낸다",
  same(familyInviteBody("CHILD", { personalData: true, healthData: true }), {
    role: "CHILD",
    guardianConsent: { personalData: true, healthData: true },
  }),
);
check(
  "초대 링크는 이 앱의 합류 화면에 코드를 붙인다",
  inviteLink("https://kium.app", "H3N8WD") === "https://kium.app/claim?code=H3N8WD" &&
    inviteLink("https://kium.app", "A B") === "https://kium.app/claim?code=A%20B",
);
check(
  "가족 초대 코드의 제목은 역할로, 자리 초대는 그 사람 이름으로",
  inviteCodeTitle({ role: "PARENT" }) === "보호자 초대 코드" &&
    inviteCodeTitle({ role: "CHILD" }) === "아이 초대 코드" &&
    inviteCodeTitle({ role: "PARENT", seatName: "도현" }) === "도현 자리 초대 코드",
);
check(
  "공유 글은 가족 이름, 역할, 코드를 말한다",
  inviteShareText({ familyName: "서준이네", code: "H3N8WD", role: "PARENT" }) ===
    "서준이네에 보호자로 초대해요. 초대 코드 H3N8WD" &&
    inviteShareText({ familyName: "서준이네", code: "Q2W3E4", role: "CHILD" }) ===
      "서준이네에 아이로 초대해요. 초대 코드 Q2W3E4",
  inviteShareText({ familyName: "서준이네", code: "Q2W3E4", role: "CHILD" }),
);
check(
  "자리 초대의 공유 글은 그 사람 자리로 부른다",
  inviteShareText({ familyName: "서준이네", code: "K7M2QT", role: "PARENT", seatName: "도현" }) ===
    "서준이네에 도현 자리로 초대해요. 초대 코드 K7M2QT",
);
check(
  "보낸 초대 한 줄은 역할과 기한, 보낸 사람",
  pendingInviteTitle({ role: "CHILD" }) === "아이 초대" &&
    pendingInviteDetail({ expiresAt: "2026-10-08", issuedByName: "은영" }) ===
      "10월 8일까지, 은영님이 보냈어요" &&
    pendingInviteDetail({ expiresAt: "2026-10-08", issuedByName: null }) === "10월 8일까지",
);
check(
  "초대 문구에 가운데 점과 긴 대시를 쓰지 않는다",
  [
    inviteCodeTitle({ role: "CHILD" }),
    inviteShareText({ familyName: "서준이네", code: "Q2W3E4", role: "CHILD" }),
    pendingInviteDetail({ expiresAt: "2026-10-08", issuedByName: "은영" }),
  ].every((l) => !/[·—–]/.test(l)),
);
{
  const page = readFileSync("src/app/parent/family/page.tsx", "utf8");
  const sheet = readFileSync("src/components/domain/invite-sheet.tsx", "utf8");
  check(
    "가족 관리의 「보호자 더하기」(정보 먼저 입력)는 초대로 바뀐다",
    !page.includes("보호자 더하기") && !page.includes("useCreateProfile"),
  );
  check(
    "폰 없는 아이는 지금처럼 「아이 등록하기」 로 넣는다",
    page.includes("아이 등록하기") && page.includes('href="/start/child"'),
  );
  check(
    "초대 시트는 가족 초대 코드를 만들고 자리 초대도 남긴다",
    sheet.includes("useCreateFamilyInvite") && sheet.includes("useOpenInvite"),
  );
  check(
    "가족 관리는 아직 쓰지 않은 초대를 보이고 취소할 수 있다",
    page.includes("useFamilyInvites") && page.includes("useCancelFamilyInvite"),
  );
}

/* ─── 초대 코드로 참여하기 ─────────────────────────────── */

{
  const ON = "2026-10-01";
  const familyPeek = { kind: "FAMILY" as const, familyName: "서준이네", role: "PARENT" as const };
  const kidPeek = { ...familyPeek, role: "CHILD" as const };
  const seatPeek = {
    kind: "PROFILE" as const,
    familyName: "서준이네",
    profileName: "도현",
    role: "PARENT" as const,
  };
  const adult = {
    name: " 지수 ",
    birthDate: "1990-05-05",
    sex: "F" as const,
    height: "",
    weight: "",
  };

  check(
    "코드는 대문자와 숫자 여섯 자리로 다듬는다",
    normalizeCode(" h3n-8wd ") === "H3N8WD" && normalizeCode("abcdefgh") === "ABCDEF",
  );
  check(
    "kind 가 FAMILY 일 때만 가족 초대다. 안 주는 서버는 자리 초대로 본다",
    isFamilyInvite(familyPeek) &&
      !isFamilyInvite(seatPeek) &&
      !isFamilyInvite({}) &&
      !isFamilyInvite(undefined),
  );
  check(
    "미리 보기 한 줄은 가족 초대면 가족과 역할, 자리 초대면 그 자리",
    invitePeekLine(familyPeek) === "서준이네에 보호자로 초대받았어요" &&
      invitePeekLine(kidPeek) === "서준이네에 아이로 초대받았어요" &&
      invitePeekLine(seatPeek) === "서준이네 도현 자리",
  );
  check(
    "생년월일 고르기는 지금 쓰는 규칙 그대로(보호자, 아이)",
    same(inviteBirthRule("PARENT", ON), guardianBirthRule(ON)) &&
      same(inviteBirthRule("CHILD", ON), childBirthRule(ON)),
  );
  check(
    "이름, 생년월일, 성별을 다 넣어야 참여할 수 있다",
    joinReady("PARENT", adult, ON) &&
      !joinReady("PARENT", { ...adult, name: "  " }, ON) &&
      !joinReady("PARENT", { ...adult, birthDate: "" }, ON) &&
      !joinReady("PARENT", { ...adult, sex: null }, ON),
  );
  check(
    "보호자로 초대받았는데 만 14세 미만이면 까닭을 말하고 막는다",
    joinProblem("PARENT", { ...adult, birthDate: "2015-05-05" }, ON) ===
      "보호자는 만 14세부터 참여할 수 있어요" &&
      !joinReady("PARENT", { ...adult, birthDate: "2015-05-05" }, ON),
  );
  check(
    "아이로 초대받았으면 어린 나이도 된다",
    joinProblem("CHILD", { ...adult, birthDate: "2018-03-05" }, ON) === null &&
      joinReady("CHILD", { ...adult, birthDate: "2018-03-05" }, ON),
  );
  check(
    "키와 몸무게는 비워도 되고, 적었으면 범위 안이어야 한다",
    joinReady("PARENT", { ...adult, height: "165", weight: "55" }, ON) &&
      joinProblem("PARENT", { ...adult, height: "400" }, ON) === "230cm보다 작아야 해요." &&
      !joinReady("PARENT", { ...adult, height: "400" }, ON),
  );
  check(
    "자리 초대는 코드만 보낸다",
    same(claimBody("K7M2QT", seatPeek, adult), { claimCode: "K7M2QT" }) &&
      same(claimBody("K7M2QT", undefined, adult), { claimCode: "K7M2QT" }),
  );
  check(
    "가족 초대는 이름(앞뒤 빈칸 없이), 생년월일, 성별을 싣고 적은 키와 몸무게만 싣는다",
    same(claimBody("H3N8WD", familyPeek, adult), {
      claimCode: "H3N8WD",
      name: "지수",
      birthDate: "1990-05-05",
      sex: "F",
    }) &&
      same(claimBody("H3N8WD", familyPeek, { ...adult, height: "165.5", weight: "55" }), {
        claimCode: "H3N8WD",
        name: "지수",
        birthDate: "1990-05-05",
        sex: "F",
        heightCm: 165.5,
        weightKg: 55,
      }),
  );
  check(
    "참여 단추는 가족 초대면 「가족 참여하기」, 자리 초대면 그 자리로",
    joinButtonLabel(familyPeek) === "가족 참여하기" &&
      joinButtonLabel(seatPeek) === "도현 자리로 들어가기" &&
      joinButtonLabel(undefined) === "가족 참여하기",
  );
  const claimPage = readFileSync("src/app/claim/page.tsx", "utf8");
  check(
    "합류 화면은 가족 초대면 지금 쓰는 달력 부품으로 생년월일을 받는다",
    claimPage.includes("DateField") && claimPage.includes("inviteBirthRule"),
  );
}

/* ─── 초대 코드 오류 안내 ─────────────────────────────── */

{
  const err = (code: string, status = 409) => new ApiError(status, code, "");
  // BE 와 맞춘 claim 의 오류 전부
  const claimCodes = [
    "BAD_REQUEST",
    "UNDER_14_NOT_ALLOWED",
    "CODE_NOT_FOUND",
    "ALREADY_CLAIMED",
    "CODE_EXPIRED",
    "ALREADY_MEMBER",
    "ALREADY_IN_FAMILY",
    "TOO_MANY",
  ];
  check(
    "합류 화면의 표는 claim 오류 코드를 빠짐없이 말한다",
    claimCodes.every((c) => (CLAIM_ERROR_COPY[c] ?? "").trim() !== ""),
    claimCodes.filter((c) => !CLAIM_ERROR_COPY[c]).join(", "),
  );
  check(
    "다른 가족에 이미 있는 계정은 까닭과 해결법(설정에서 탈퇴)을 듣는다",
    claimErrorMessage(err("ALREADY_IN_FAMILY")) ===
      "이미 다른 가족에 참여한 계정이에요. 설정에서 계정을 탈퇴한 뒤 다시 시도해 주세요.",
  );
  check(
    "이미 이 가족인 사람(초대한 보호자)은 초대받는 분의 기기에서 넣으라고 듣는다",
    claimErrorMessage(err("ALREADY_MEMBER")) ===
      "이미 이 가족의 구성원이에요. 초대받는 분의 기기에서 코드를 입력해 주세요.",
  );
  check(
    "모르는 실패는 「들어가지 못했어요」 하나로 끝내지 않고 다시 해 보라고 한다",
    claimErrorMessage(err("SOMETHING_NEW", 500)) ===
      "가족에 참여하지 못했어요. 잠시 뒤에 다시 해 주세요." &&
      claimErrorMessage(new Error("network")) ===
        "가족에 참여하지 못했어요. 잠시 뒤에 다시 해 주세요.",
  );
  check(
    "미리 보기가 이 코드로는 못 들어간다고 하면 단추를 잠근다",
    [
      "CODE_NOT_FOUND",
      "CODE_EXPIRED",
      "ALREADY_CLAIMED",
      "ALREADY_MEMBER",
      "ALREADY_IN_FAMILY",
      "TOO_MANY",
    ].every((c) => blocksClaim(err(c))) &&
      !blocksClaim(err("UNAUTHORIZED", 401)) &&
      !blocksClaim(err("UNKNOWN", 500)) &&
      !blocksClaim(new Error("network")),
  );
  const common = [
    "CODE_NOT_FOUND",
    "CODE_EXPIRED",
    "ALREADY_CLAIMED",
    "ALREADY_MEMBER",
    "ALREADY_IN_FAMILY",
    "INVITE_NOT_FOUND",
    "FAMILY_NOT_FOUND",
    "UNDER_14_NOT_ALLOWED",
  ];
  check(
    "여러 화면에서 같은 뜻인 초대 코드 오류는 공통 문구(COMMON_MESSAGE)에도 있다",
    common.every((c) => !!err(c).commonMessage),
    common.filter((c) => !err(c).commonMessage).join(", "),
  );
  check(
    "공통 문구와 합류 화면이 같은 코드를 같은 말로 한다",
    ["CODE_NOT_FOUND", "CODE_EXPIRED", "ALREADY_MEMBER", "ALREADY_IN_FAMILY"].every(
      (c) => err(c).commonMessage === CLAIM_ERROR_COPY[c],
    ),
  );
  check(
    "오류 문구에 가운데 점과 긴 대시를 쓰지 않는다",
    [...Object.values(CLAIM_ERROR_COPY), ...common.map((c) => err(c).commonMessage ?? "")].every(
      (l) => !/[·—–]/.test(l),
    ),
  );
  const claimPage = readFileSync("src/app/claim/page.tsx", "utf8");
  check(
    "합류 화면은 lib/invite 의 표 하나로 말한다",
    claimPage.includes("claimErrorMessage") && !claimPage.includes("들어가지 못했어요"),
  );
}

/* ─── 가족이 있는 계정이 초대 코드를 들고 로그인했다 ─────────── */

check(
  "가족이 있는 계정(홈, 참여 방식)이 코드를 들고 로그인하면 코드를 쓰지 않은 것이다",
  unusedInvite({ nextStep: "HOME" }, "H3N8WD") &&
    unusedInvite({ nextStep: "SUPPORT_MODE" }, "H3N8WD"),
);
check(
  "가족이 없는 계정이나 코드 없이 들어온 계정은 알리지 않는다",
  !unusedInvite({ nextStep: "CLAIM" }, "H3N8WD") &&
    !unusedInvite({ nextStep: "CREATE_FAMILY" }, "H3N8WD") &&
    !unusedInvite({ nextStep: "HOME" }, undefined) &&
    !unusedInvite({ nextStep: "HOME" }, ""),
);
check(
  "코드를 쓰지 않았다는 안내는 까닭과 해결법을 말한다",
  UNUSED_INVITE_COPY.title === "이미 가족이 있는 계정이라 초대 코드를 쓰지 않았어요" &&
    UNUSED_INVITE_COPY.detail.includes("설정에서 계정을 탈퇴한 뒤") &&
    ![UNUSED_INVITE_COPY.title, UNUSED_INVITE_COPY.detail].some((l) => /[·—–]/.test(l)),
);
{
  const page = readFileSync("src/app/login/page.tsx", "utf8");
  check(
    "로그인 화면은 버려질 뻔한 코드를 한 번 알린다",
    page.includes("unusedInvite(") && page.includes("UNUSED_INVITE_COPY"),
  );
}

/* ─── 이 기기를 누가 쓰는지는 계정의 역할로 정한다 ─────────────── */

check("정해 둔 것이 없으면 보호자 계정은 부모 화면이다", modeFor("PARENT", null) === "parent");
check("정해 둔 것이 없으면 자녀 계정은 아이 화면이다", modeFor("CHILD", null) === "kid");
check(
  "보호자가 폰을 아이에게 빌려준 중이면 아이 화면을 그대로 둔다",
  modeFor("PARENT", "kid") === "kid",
);
check("자녀 계정은 기기에 부모가 남아 있어도 아이 화면이다", modeFor("CHILD", "parent") === "kid");
check(
  "계정의 역할을 모르면 정해 둔 것만 따르고 없으면 정하지 않는다",
  modeFor(undefined, "parent") === "parent" && modeFor(undefined, null) === null,
);
check(
  "아이 화면은 아이 홈, 부모 화면은 부모 홈, 정하지 못했으면 누가 쓰는지 고르는 화면",
  homeOf("kid") === "/kid" && homeOf("parent") === "/parent" && homeOf(null) === "/start",
);

console.log(failed === 0 ? "\n전부 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
