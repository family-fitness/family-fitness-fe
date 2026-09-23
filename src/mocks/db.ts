/**
 * 목 서버의 상태.
 *
 * 가짜 서버가 들고 있는 가족 · 미션 · 칭찬과, 그것을 탭 저장소에 남기고 되살리는 일.
 * 요청 처리기(`handlers.ts` 와 기능별 파일)는 여기서 읽고 여기에 쓴다.
 */
import { HttpResponse } from "msw";

import type {
  CheerLog,
  ApiErrorBody,
  Band,
  CoachApproveResult,
  CoachRun,
  FamilyProfiles,
  FitnessItems,
  FitnessMap,
  LatestFitnessTest,
  MeResponse,
  Mission,
  MissionList,
  PredictionResult,
  ProfileSummary,
  VideoList,
} from "@/lib/api/types";

import { dayOf, toDateString } from "@/lib/today";

import fixturesJson from "./fixtures.json";

/** 픽스처의 모양. */
/** 선택 표시(`?`)만 걷어낸다. */
export type Concrete<T> = T extends (infer U)[]
  ? Concrete<U>[]
  : T extends object
    ? { [K in keyof T]-?: Concrete<T[K]> }
    : T;

export interface Fixtures {
  me: MeResponse;
  profiles: FamilyProfiles;
  fitnessMap: FitnessMap;
  itemsByAgeGroup: Record<string, FitnessItems>;
  latestByProfile: Record<string, LatestFitnessTest>;
  coachRun: CoachRun;
  coachApprove: CoachApproveResult;
  missionsAfterApproval: MissionList;
  videos: VideoList;
  prediction: PredictionResult;
}

export const fixtures = fixturesJson as unknown as Concrete<Fixtures>;

/** 목 서버가 만들고 고치는 값들. 응답과 같은 모양이어야 화면이 진짜처럼 돈다 */
/**
 * 목이 돌려주는 프로필.
 *
 * `sex` 는 생성된 스키마에 아직 없다 — 가족을 만들 때는 받으면서 조회 응답에는
 * 안 돌려준다(`BACKEND_ASKS.md`). 목은 요청한 모양대로 돌려준다.
 */
export type Profile = Concrete<ProfileSummary> & { sex?: "M" | "F" };
export type MapMember = Concrete<FitnessMap>["members"][number];
export type MissionRow = Concrete<Mission>;

export const BASE = "/api/v1";
export const CHEER_KEY = "ff-mock-cheers";
export const MISSION_KEY = "ff-mock-missions";
export const RUN_KEY = "ff-mock-run";
export const ACTING_KEY = "ff-mock-acting";
export const STAGE_KEY = "ff-mock-stage";
export const FAMILY_KEY = "ff-mock-family";

export const DEMO = {
  familyId: "00000000-0000-4000-8000-000000000010",
  mom: "00000000-0000-4000-8000-000000000011",
  kid: "00000000-0000-4000-8000-000000000012",
  dad: "00000000-0000-4000-8000-000000000013",
} as const;

/** 지난 코치 회차. 이미 승인해서 돌아가고 있는 미션들이 여기서 나왔다 */
export const PAST_RUN_ID = "00000000-0000-4000-8000-0000000000a0";

/* ─── 서버 상태 ────────────────────────────────────────────── */

/** 새로고침하면 초기 상태로 돌아간다. 시연 중 되돌리기 쉽게 하려는 의도다 */
export const db = {
  profiles: loadFamily("profiles", fixtures.profiles),
  fitnessMap: loadFamily("fitnessMap", fixtures.fitnessMap),
  latest: structuredClone(fixtures.latestByProfile),
  coachRun: loadCoachRun(),
  /** 이번 주 제안은 아직 0건이다. 심어 둔 것은 지난 회차에서 승인한 미션들이다 */
  missions: loadMissions(),
  videos: structuredClone(fixtures.videos.videos),
  /** 주고받은 칭찬 · 알림. */
  cheers: loadCheers(),
  /**
   * 측정 회차에 같이 적은 키 · 몸무게.
   * ▲ 서버는 받아 두고도 `latest` 로 돌려주지 않는다. 목에서는 돌려준다.
   */
  body: {
    [DEMO.kid]: { heightCm: 139, weightKg: 34 },
    [DEMO.mom]: { heightCm: 163, weightKg: 56 },
  } as Record<string, { heightCm: number; weightKg: number }>,
  /**
   * 지금 로그인해서 보고 있는 사람.
   * 새로고침해도 남아야 한다 — 바꾸자마자 되돌아가면 자녀 계정 화면을 볼 수 없다.
   */
  actingProfileId: loadActing(),
  /** 이 계정이 어디까지 와 있나 — 가족 없음 · 초대 대기 · 가족 있음 */
  stage: loadStage(),
  /**
   * 이번 주 코치 회차를 한 번이라도 돌렸나.
   * 새로 만든 가족은 아직 안 돌렸다 — `latest` 가 404 여야 「제안 만들기」 가 뜬다.
   */
  hasCoachRun: true,
};

/**
 * 지금 로그인한 계정이 어디까지 와 있나.
 *
 * 전에는 "초대받는 계정인가" 불리언 하나였다. 그러면 **가족이 아직 없는 계정**을
 * 만들 수가 없어서 `POST /families` 로 가는 길이 아예 없었다 — 처음 쓰는 사람의
 * 경로를 한 번도 못 돌아 본 이유다.
 *
 * | 단계    | `/me` 가 주는 nextStep | 무엇                          |
 * | ------- | ---------------------- | ----------------------------- |
 * | `fresh` | `CREATE_FAMILY`        | 가족이 없다. 만드는 것부터     |
 * | `claim` | `CLAIM`                | 초대코드를 넣어야 가족에 붙는다 |
 * | `home`  | `HOME`                 | 가족이 있다                    |
 */
export type Stage = "fresh" | "claim" | "home";

export function loadStage(): Stage {
  try {
    const saved = sessionStorage.getItem(STAGE_KEY);
    if (saved === "fresh" || saved === "claim" || saved === "home") return saved;
  } catch {
    return "home";
  }
  return "home";
}

export function setStage(value: Stage) {
  db.stage = value;
  try {
    sessionStorage.setItem(STAGE_KEY, value);
  } catch {
    // 브라우저가 아니면 그냥 넘어간다
  }
}

export function loadActing(): string {
  try {
    return sessionStorage.getItem(ACTING_KEY) ?? DEMO.mom;
  } catch {
    return DEMO.mom;
  }
}

/**
 * 탭 저장소에서 되살린다. 없으면 **이미 쓰던 가족**으로 시작한다.
 *
 * 빈 상태로 시작하면 칭찬 화면도, 부모 홈의 오늘도, 기념 표시도 전부 빈 화면이다.
 * 시연에서 처음 보는 화면이 전부 "아직 없어요" 면 이 앱이 무엇을 하는지 보여 줄
 * 기회가 없다. 첫 화면부터 며칠치 기록이 쌓여 있어야 순환이 보인다.
 */
export function loadCheers(): CheerLog[] {
  try {
    const saved = sessionStorage.getItem(CHEER_KEY);
    if (saved) return JSON.parse(saved) as CheerLog[];
  } catch {
    return seedCheers();
  }
  return seedCheers();
}

/**
 * 며칠 전 몇 시.
 *
 * 오늘 것은 **지금보다 앞선 시각이 되면 안 된다** — 새벽에 열면 저녁 7시가
 * 미래가 되고, 화면이 아직 오지 않은 일을 이미 일어난 일처럼 보여 준다.
 */
export function daysAgo(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(days === 0 ? Math.min(hour, d.getHours()) : hour, 12, 0, 0);
  return d.toISOString();
}

/**
 * 이번 주에 오간 말들. 날짜는 늘 오늘 기준이라 언제 열어도 이번 주다.
 *
 * 오는 순서가 중요하다 — 아이가 알리면(`missionId` 있음) 부모가 답한다.
 * 그 짝이 맞아야 부모 홈의 "오늘" 이 기다리는 줄과 답한 줄을 가른다.
 *
 * **오늘 것 하나는 답이 없는 채로 둔다.** 부모가 앱을 열었을 때 할 일이
 * 하나 있어야 이 서비스가 무엇을 하는지 한 화면에서 보인다.
 */
export function seedCheers(): CheerLog[] {
  type Row = { from: string; to: string; msg: string; mission: string | null; days: number };
  const rows: Row[] = [
    // 오늘 — 아이가 알렸고 부모는 아직 답하지 않았다
    { from: DEMO.kid, to: DEMO.mom, msg: "줄넘기 2분 다 했어요!", mission: "seed-m1", days: 0 },
    { from: DEMO.kid, to: DEMO.dad, msg: "줄넘기 2분 다 했어요!", mission: "seed-m1", days: 0 },
    // 어제 — 알리고 받았다
    { from: DEMO.kid, to: DEMO.mom, msg: "같이 스트레칭 다 했어요!", mission: "seed-m2", days: 1 },
    { from: DEMO.mom, to: DEMO.kid, msg: "끝까지 한 게 제일 멋있어", mission: "seed-m2", days: 1 },
    { from: DEMO.dad, to: DEMO.kid, msg: "아빠보다 오래 하던데?", mission: "seed-m2", days: 1 },
    // 사흘 전
    { from: DEMO.kid, to: DEMO.mom, msg: "제자리 뛰기 다 했어요!", mission: "seed-m3", days: 3 },
    { from: DEMO.mom, to: DEMO.kid, msg: "오늘 진짜 잘했어", mission: "seed-m3", days: 3 },
  ];
  const nameOf = (id: string) =>
    fixtures.profiles.profiles.find((p) => p.profileId === id)?.name ?? "가족";

  return rows.map((row, i) => ({
    cheerId: `seed-cheer-${i}`,
    fromProfileId: row.from,
    fromName: nameOf(row.from),
    toProfileId: row.to,
    message: row.msg,
    missionId: row.mission,
    createdAt: daysAgo(row.days, row.from === DEMO.kid ? 17 : 21),
  }));
}

/**
 * 이미 승인해서 돌아가고 있는 미션들.
 *
 * "승인해야 미션이 된다" 는 **이번 주 제안**에 대한 말이다(도메인 규칙 1).
 * 지난주에 승인한 미션까지 없는 척하면, 시연을 여는 가족은 이 앱을 오늘 처음
 * 깐 것이 되고 자라는 기록도 최근 기록도 전부 빈 화면이 된다.
 * 그래서 **지난 코치 회차**에서 나온 미션을 심고, 이번 주 회차는 승인 전으로 둔다.
 */
/** 영상 속 한 토막. ▲ `endSec` 는 계약에 없다 — 목에서는 준다 */
export function clip(videoId: string, startSec: number, endSec: number, title: string) {
  return {
    videoId,
    startSec,
    endSec,
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export function seedMissions(): MissionRow[] {
  const day = (back: number) => dayOf(daysAgo(back, 12));
  return [
    {
      missionId: "seed-m1",
      title: "줄넘기 2분",
      origin: "COACH",
      coachRunId: PAST_RUN_ID,
      targetMetric: "TIMER_MINUTES",
      targetValue: 20,
      serverVerifiable: true,
      startDate: day(6),
      endDate: day(0),
      rationale: "심폐지구력은 짧게 자주가 길게 한 번보다 낫습니다.",
      video: {
        videoId: "IdpXx2gm90o",
        title: "초등학생의 기초체력향상과 운동능력발달을 위한 운동",
        url: "https://www.youtube.com/watch?v=IdpXx2gm90o",
        durationSec: 600,
        startSec: 96,
      },
      /*
        ▲ 서버에 아직 없다. 제안 모양으로 답한다.
        운동처방 하나가 영상 한 편이 아니라 영상 안의 한 토막이라,
        하루치가 준비·본·정리 셋으로 나뉜다.
      */
      sessions: [
        {
          position: 1,
          phase: "WARMUP",
          title: "팔 벌려 뛰기",
          factor: "심폐지구력",
          minutes: 2,
          clip: clip("IdpXx2gm90o", 12, 130, "팔 벌려 뛰기"),
          completed: true,
          verifiedBy: "VIDEO_PROGRESS",
        },
        {
          position: 2,
          phase: "MAIN",
          title: "제자리 달리기",
          factor: "심폐지구력",
          minutes: 15,
          clip: clip("IdpXx2gm90o", 186, 340, "제자리 달리기"),
          completed: false,
          verifiedBy: null,
        },
        {
          position: 3,
          phase: "COOLDOWN",
          title: "나비자세",
          factor: "유연성",
          minutes: 3,
          clip: clip("IdpXx2gm90o", 580, 738, "나비자세"),
          completed: false,
          verifiedBy: null,
        },
      ],
      participants: [
        {
          profileId: DEMO.kid,
          name: "서준",
          progress: 0.7,
          completed: false,
          verifiedBy: "TIMER",
          needsGuardianCheck: false,
        },
        {
          profileId: DEMO.mom,
          name: "은영",
          progress: 0.3,
          completed: false,
          verifiedBy: "TIMER",
          needsGuardianCheck: false,
        },
      ],
    },
    {
      missionId: "seed-m2",
      title: "같이 스트레칭",
      origin: "COACH",
      coachRunId: PAST_RUN_ID,
      targetMetric: "TIMER_MINUTES",
      targetValue: 30,
      serverVerifiable: true,
      startDate: day(9),
      endDate: day(3),
      rationale: "유연성은 매일 조금씩 늘려 가는 영역입니다.",
      video: {
        videoId: "IdpXx2gm90o",
        title: "온 가족이 함께하는 스트레칭",
        url: "https://www.youtube.com/watch?v=IdpXx2gm90o",
        durationSec: 480,
        startSec: 0,
      },
      participants: [
        {
          profileId: DEMO.kid,
          name: "서준",
          progress: 1,
          completed: true,
          verifiedBy: "VIDEO_PROGRESS",
          needsGuardianCheck: false,
        },
        {
          profileId: DEMO.mom,
          name: "은영",
          progress: 1,
          completed: true,
          verifiedBy: "TIMER",
          needsGuardianCheck: false,
        },
      ],
    },
    {
      /*
        직접 적은 기록. **목표를 넘겨도 완료가 아니다** — 보호자가 확인해야
        완료가 된다(도메인 규칙 2). 그래서 completed 는 false 로 둔다.
        부모 홈에 "확인해 주기" 가 하나 떠 있어야 이 규칙이 화면에서 보인다.
      */
      missionId: "seed-m3",
      title: "제자리 뛰기 100번",
      origin: "PARENT",
      coachRunId: null,
      targetMetric: "STEPS",
      targetValue: 3000,
      serverVerifiable: false,
      startDate: day(4),
      endDate: day(0),
      rationale: null,
      video: null,
      participants: [
        {
          profileId: DEMO.kid,
          name: "서준",
          progress: 1,
          completed: false,
          verifiedBy: "SELF_REPORT",
          needsGuardianCheck: true,
        },
      ],
    },
    {
      /* 지지난주. 지난 기록에 한 줄 더 있어야 목록이 목록으로 보인다 */
      missionId: "seed-m0",
      title: "저녁 산책 20분",
      origin: "PARENT",
      coachRunId: null,
      targetMetric: "TIMER_MINUTES",
      targetValue: 60,
      serverVerifiable: true,
      startDate: day(20),
      endDate: day(14),
      rationale: null,
      video: null,
      participants: [
        {
          profileId: DEMO.kid,
          name: "서준",
          progress: 1,
          completed: true,
          verifiedBy: "TIMER",
          needsGuardianCheck: false,
        },
        {
          profileId: DEMO.dad,
          name: "도현",
          progress: 1,
          completed: true,
          verifiedBy: "TIMER",
          needsGuardianCheck: false,
        },
      ],
    },
  ] as unknown as MissionRow[];
}

/**
 * 이번 주 코치 회차.
 *
 * 픽스처에 날짜를 박아 두면 며칠만 지나도 "9월 14일 주간" 처럼 지난주 제안을
 * 승인하라고 내민다. 제안 기간도 이번 주로 맞춘다 — 기간이 지난 제안을
 * 승인하면 태어나자마자 끝난 미션이 된다.
 */
export function freshCoachRun() {
  const run = structuredClone(fixtures.coachRun);
  const week = thisWeek();
  run.weekStart = week.weekStart;
  run.proposals = (run.proposals ?? []).map((proposal) => ({
    ...proposal,
    startDate: week.weekStart,
    endDate: week.weekEnd,
  }));
  return run;
}

/**
 * 승인·거절·미션 만들기는 **탭이 살아 있는 동안 남는다.**
 *
 * 전에는 모듈 상태로만 들고 있어서 새로고침 한 번에 방금 승인한 제안이
 * 승인 전으로 돌아갔다. 시연 중에 그러면 방금 한 일이 없던 일이 된다.
 * 칭찬과 같은 자리(탭 저장소)에 둔다 — 새 탭을 열면 처음부터다.
 */
export function loadMissions(): MissionRow[] {
  try {
    const saved = sessionStorage.getItem(MISSION_KEY);
    if (saved) return JSON.parse(saved) as MissionRow[];
  } catch {
    return seedMissions();
  }
  return seedMissions();
}

export function saveMissions() {
  try {
    sessionStorage.setItem(MISSION_KEY, JSON.stringify(db.missions));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

export function loadCoachRun() {
  try {
    const saved = sessionStorage.getItem(RUN_KEY);
    if (saved) return JSON.parse(saved) as ReturnType<typeof freshCoachRun>;
  } catch {
    return freshCoachRun();
  }
  return freshCoachRun();
}

export function saveCoachRun() {
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify(db.coachRun));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

/**
 * 새로 만든 가족을 탭 저장소에서 되살린다.
 *
 * 안 그러면 새로고침 한 번에 방금 만든 가족이 서준이네로 되돌아간다 —
 * 가입하자마자 남의 집이 뜬다.
 */
export function loadFamily<T>(key: "profiles" | "fitnessMap", fallback: T): T {
  try {
    const saved = sessionStorage.getItem(`${FAMILY_KEY}-${key}`);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    return structuredClone(fallback);
  }
  return structuredClone(fallback);
}

export function saveFamily() {
  try {
    sessionStorage.setItem(`${FAMILY_KEY}-profiles`, JSON.stringify(db.profiles));
    sessionStorage.setItem(`${FAMILY_KEY}-fitnessMap`, JSON.stringify(db.fitnessMap));
  } catch {
    // 저장이 안 돼도 이번 화면에서는 돈다
  }
}

export function saveCheers(cheers: CheerLog[]) {
  try {
    sessionStorage.setItem(CHEER_KEY, JSON.stringify(cheers));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

export function setActingProfile(profileId: string) {
  db.actingProfileId = profileId;
  try {
    sessionStorage.setItem(ACTING_KEY, profileId);
  } catch {
    // 브라우저가 아니면 그냥 넘어간다
  }
}

export function acting(): Profile | undefined {
  return db.profiles.profiles.find((p) => p.profileId === db.actingProfileId);
}

/** 서버와 같은 봉투 모양으로 실패를 돌려준다 */
export function fail(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

/**
 * 이번 주 일요일~토요일.
 *
 * 픽스처에 날짜를 박아 두면 며칠만 지나도 "이번 주 기록" 화면에 지난주가 뜬다.
 * 데모를 언제 열어도 말이 되게 오늘을 기준으로 계산한다.
 */
export function thisWeek(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { weekStart: toDateString(sunday), weekEnd: toDateString(saturday) };
}

export function uuid() {
  return crypto.randomUUID();
}

export function bandOf(percentile: number): Band {
  if (percentile >= 75) return "strength";
  if (percentile >= 25) return "steady";
  return "growth";
}
