/** MSW 목 서버 — 백엔드가 안 떠 있을 때 쓴다. */
import { HttpResponse, http, type PathParams } from "msw";

import type {
  AgeGroup,
  CheerLog,
  FitnessTestResult,
  ItemResult,
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

import { isVideoDone, serverKnows } from "@/lib/mission";
import { ageOf, today } from "@/lib/today";

import fixturesJson from "./fixtures.json";

/** 픽스처의 모양. */
/** 선택 표시(`?`)만 걷어낸다. */
type Concrete<T> = T extends (infer U)[]
  ? Concrete<U>[]
  : T extends object
    ? { [K in keyof T]-?: Concrete<T[K]> }
    : T;

interface Fixtures {
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

const fixtures = fixturesJson as unknown as Concrete<Fixtures>;

/** 목 서버가 만들고 고치는 값들. 응답과 같은 모양이어야 화면이 진짜처럼 돈다 */
type Profile = Concrete<ProfileSummary>;
type MapMember = Concrete<FitnessMap>["members"][number];
type MissionRow = Concrete<Mission>;

const BASE = "/api/v1";
const CHEER_KEY = "ff-mock-cheers";
const MISSION_KEY = "ff-mock-missions";
const RUN_KEY = "ff-mock-run";
const ACTING_KEY = "ff-mock-acting";
const NEWCOMER_KEY = "ff-mock-newcomer";

export const DEMO = {
  familyId: "00000000-0000-4000-8000-000000000010",
  mom: "00000000-0000-4000-8000-000000000011",
  kid: "00000000-0000-4000-8000-000000000012",
  dad: "00000000-0000-4000-8000-000000000013",
} as const;

/** 지난 코치 회차. 이미 승인해서 돌아가고 있는 미션들이 여기서 나왔다 */
const PAST_RUN_ID = "00000000-0000-4000-8000-0000000000a0";

/* ─── 서버 상태 ────────────────────────────────────────────── */

/** 새로고침하면 초기 상태로 돌아간다. 시연 중 되돌리기 쉽게 하려는 의도다 */
const db = {
  profiles: structuredClone(fixtures.profiles),
  fitnessMap: structuredClone(fixtures.fitnessMap),
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
  /**
   * 아직 가족에 붙지 않은 계정으로 들어와 있나.
   * 초대 수락 흐름은 이 상태가 있어야만 걸어 볼 수 있다.
   */
  newcomer: loadNewcomer(),
};

function loadNewcomer(): boolean {
  try {
    return sessionStorage.getItem(NEWCOMER_KEY) === "1";
  } catch {
    return false;
  }
}

function setNewcomer(value: boolean) {
  db.newcomer = value;
  try {
    sessionStorage.setItem(NEWCOMER_KEY, value ? "1" : "0");
  } catch {
    // 브라우저가 아니면 그냥 넘어간다
  }
}

function loadActing(): string {
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
function loadCheers(): CheerLog[] {
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
function daysAgo(days: number, hour: number): string {
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
function seedCheers(): CheerLog[] {
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
function seedMissions(): MissionRow[] {
  const day = (back: number) => daysAgo(back, 12).slice(0, 10);
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
function freshCoachRun() {
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
function loadMissions(): MissionRow[] {
  try {
    const saved = sessionStorage.getItem(MISSION_KEY);
    if (saved) return JSON.parse(saved) as MissionRow[];
  } catch {
    return seedMissions();
  }
  return seedMissions();
}

function saveMissions() {
  try {
    sessionStorage.setItem(MISSION_KEY, JSON.stringify(db.missions));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

function loadCoachRun() {
  try {
    const saved = sessionStorage.getItem(RUN_KEY);
    if (saved) return JSON.parse(saved) as ReturnType<typeof freshCoachRun>;
  } catch {
    return freshCoachRun();
  }
  return freshCoachRun();
}

function saveCoachRun() {
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify(db.coachRun));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

function saveCheers(cheers: CheerLog[]) {
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

function acting(): Profile | undefined {
  return db.profiles.profiles.find((p) => p.profileId === db.actingProfileId);
}

/** 서버와 같은 봉투 모양으로 실패를 돌려준다 */
function fail(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

/**
 * 이번 주 일요일~토요일.
 *
 * 픽스처에 날짜를 박아 두면 며칠만 지나도 "이번 주 기록" 화면에 지난주가 뜬다.
 * 데모를 언제 열어도 말이 되게 오늘을 기준으로 계산한다.
 */
function thisWeek(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { weekStart: iso(sunday), weekEnd: iso(saturday) };
}

function uuid() {
  return crypto.randomUUID();
}

function bandOf(percentile: number): Band {
  if (percentile >= 75) return "strength";
  if (percentile >= 25) return "steady";
  return "growth";
}

/* ─── 인증 · 가족 ──────────────────────────────────────────── */

/**
 * 토큰 없이 들어온 요청은 진짜 서버처럼 401 로 돌려보낸다.
 *
 * 이게 없으면 목 서버가 아무에게나 답해서 로그인 화면이 한 번도 뜨지 않는다.
 * 발표 자리에서 "로그인부터 한다"는 첫 화면을 보여줄 수 없다.
 * 아무것도 돌려주지 않으면 MSW 가 다음 핸들러로 넘긴다.
 */
const authGate = [
  http.all(`${BASE}/*`, ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.includes("/auth/")) return;
    if (request.headers.get("authorization")) return;
    return fail(401, "UNAUTHORIZED", "로그인이 필요합니다");
  }),
];

/** 아직 가족이 없는 개발용 계정 */
const NEWCOMER_ID = "demo-newcomer";
const NEWCOMER_ME = {
  userId: "00000000-0000-4000-8000-000000000002",
  nextStep: "CLAIM",
  profiles: [],
};

const identity = [
  /** 지금 로그인한 계정이 관리하는 프로필. */
  http.get(`${BASE}/me`, () => {
    if (db.newcomer) return HttpResponse.json(NEWCOMER_ME);
    const me = acting();
    if (!me || me.profileId === DEMO.mom) return HttpResponse.json(fixtures.me);
    return HttpResponse.json({
      userId: fixtures.me.userId,
      nextStep: "HOME",
      profiles: [me],
    });
  }),

  http.post(`${BASE}/auth/dev-login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { providerUserId?: string };
    // 프로필이 아직 없는 계정. 초대코드를 넣어야 가족에 붙는다
    const newcomer = body.providerUserId === NEWCOMER_ID;
    setNewcomer(newcomer);
    if (!newcomer) setActingProfile(DEMO.mom);
    return HttpResponse.json({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      ...(newcomer ? NEWCOMER_ME : fixtures.me),
    });
  }),

  http.get(`${BASE}/families/:familyId/profiles`, () => HttpResponse.json(db.profiles)),

  http.post(`${BASE}/families/:familyId/profiles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const birthDate = String(body.birthDate ?? "2020-01-01");
    const age = ageOf(birthDate) ?? 0;
    const consentRequired = age < 14;

    const consent = body.guardianConsent as
      { personalData?: boolean; healthData?: boolean } | undefined;
    // 서버가 동의를 자동으로 찍지 않는다. 둘 다 true 여야 저장된다
    if (consentRequired && !(consent?.personalData && consent?.healthData)) {
      return fail(422, "CONSENT_REQUIRED", "보호자 동의가 필요합니다");
    }

    const profile: Profile = {
      profileId: uuid(),
      familyId: DEMO.familyId,
      name: String(body.name ?? ""),
      role: body.role === "PARENT" ? "PARENT" : "CHILD",
      ageGroup: ageGroupOf(age),
      hasAccount: false,
      inviteStatus: "NONE",
      supportMode: body.role === "PARENT" ? "CHEER_ONLY" : null,
      // 만 4세 미만은 규준 자체가 없다
      measurable: age >= 4,
      consentRequired,
      consentGiven: consentRequired ? true : true,
    };
    db.profiles.profiles.push(profile);
    const mapMember: MapMember = {
      profileId: profile.profileId,
      name: profile.name,
      role: profile.role,
      ageGroup: profile.ageGroup,
      hasAccount: false,
      supportMode: profile.supportMode,
      measurable: profile.measurable,
      consentRequired: profile.consentRequired,
      consentGiven: profile.consentGiven,
      headline: null,
      latest: null,
    };
    db.fitnessMap.members.push(mapMember);
    return HttpResponse.json(profile, { status: 201 });
  }),

  http.post<PathParams>(`${BASE}/profiles/:profileId/invite`, () =>
    HttpResponse.json(
      {
        claimCode: "K7M2QT",
        expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
        shareUrl: "http://localhost:3000/claim?code=K7M2QT",
      },
      { status: 201 },
    ),
  ),

  http.post(`${BASE}/profiles/claim`, async ({ request }) => {
    const { claimCode } = (await request.json()) as { claimCode: string };
    if (claimCode?.toUpperCase() !== "K7M2QT") {
      return fail(404, "CODE_NOT_FOUND", "코드를 찾을 수 없습니다");
    }
    // 코드가 맞으면 그 프로필이 내 것이 된다. 도현에게 발급된 초대다
    const dad = db.profiles.profiles.find((p) => p.profileId === DEMO.dad);
    if (dad) {
      dad.hasAccount = true;
      dad.inviteStatus = "CLAIMED";
    }
    setNewcomer(false);
    setActingProfile(DEMO.dad);
    return HttpResponse.json({
      profileId: DEMO.dad,
      familyId: DEMO.familyId,
      role: "PARENT",
      nextStep: "SUPPORT_MODE",
    });
  }),

  http.patch<PathParams>(
    `${BASE}/profiles/:profileId/support-mode`,
    async ({ params, request }) => {
      const { supportMode } = (await request.json()) as { supportMode: string };
      const profile = db.profiles.profiles.find((p) => p.profileId === params.profileId);
      if (!profile) return fail(404, "NOT_FOUND", "프로필이 없습니다");
      // CHILD 에게는 없는 개념이다
      if (profile.role === "CHILD")
        return fail(422, "NOT_APPLICABLE", "자녀에게는 없는 설정입니다");

      profile.supportMode = supportMode as Profile["supportMode"];
      syncMapMember(profile);
      return HttpResponse.json(profile);
    },
  ),

  http.patch<PathParams>(`${BASE}/profiles/:profileId/consent`, async ({ params, request }) => {
    const body = (await request.json()) as { personalData: boolean; healthData: boolean };
    const profile = db.profiles.profiles.find((p) => p.profileId === params.profileId);
    if (!profile) return fail(404, "NOT_FOUND", "프로필이 없습니다");

    const given = body.personalData && body.healthData;
    profile.consentGiven = given;
    // 철회하면 그 순간부터 측정이 막힌다
    profile.measurable = given && profile.ageGroup !== "유아기";
    syncMapMember(profile);

    return HttpResponse.json({
      consentGiven: given,
      consentAt: given ? new Date().toISOString() : null,
      consentBy: given ? db.actingProfileId : null,
      measurable: profile.measurable,
    });
  }),

  http.post(`${BASE}/families/:familyId/cheers`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    if (body.fromProfileId === body.toProfileId) {
      return fail(422, "SELF_CHEER", "자기 자신에게는 보낼 수 없습니다");
    }
    const cheer = { cheerId: uuid(), ...body, createdAt: new Date().toISOString() };
    // 받은 쪽에서 볼 수 있어야 도장 기능이 성립한다
    db.cheers.unshift({
      cheerId: cheer.cheerId,
      fromProfileId: body.fromProfileId,
      fromName:
        db.profiles.profiles.find((p) => p.profileId === body.fromProfileId)?.name ?? "가족",
      toProfileId: body.toProfileId,
      message: body.message ?? null,
      missionId: body.missionId ?? null,
      createdAt: cheer.createdAt,
    });
    saveCheers(db.cheers);
    return HttpResponse.json(cheer, { status: 201 });
  }),

  /**
   * ▲ 서버에 아직 없다. 제안 모양으로 답한다.
   * 칭찬을 보내는 길은 있는데 받은 걸 보는 길이 없어서 기능이 성립하지 않는다.
   */
  http.get(`${BASE}/families/:familyId/cheers`, ({ request }) => {
    const to = new URL(request.url).searchParams.get("toProfileId");
    const cheers = (to ? db.cheers.filter((c) => c.toProfileId === to) : db.cheers)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({ cheers });
  }),
];

function ageGroupOf(age: number): AgeGroup {
  if (age <= 6) return "유아기";
  if (age <= 12) return "유소년";
  if (age <= 18) return "청소년";
  if (age <= 64) return "성인";
  return "어르신";
}

/** 백분위 → 등급. 서버가 주는 값은 1·2·3등급과 「참가」뿐이다 */
function gradeOf(percentile: number): NonNullable<Concrete<ItemResult>["grade"]> {
  if (percentile >= 90) return "1등급";
  if (percentile >= 75) return "2등급";
  if (percentile >= 50) return "3등급";
  return "참가";
}

function syncMapMember(profile: Profile) {
  const member = db.fitnessMap.members.find((m) => m.profileId === profile.profileId);
  if (!member) return;
  member.supportMode = profile.supportMode;
  member.measurable = profile.measurable;
  member.consentGiven = profile.consentGiven;
}

/** 연령대 → 만 나이 범위. 영상 연령 필터가 이 범위와 겹치는지 본다 */
const AGE_RANGE: Record<string, [number, number]> = {
  유아기: [0, 6],
  유소년: [7, 12],
  청소년: [13, 18],
  성인: [19, 64],
  어르신: [65, 99],
};

/* ─── 측정 ─────────────────────────────────────────────────── */

const fitness = [
  http.get(`${BASE}/fitness/items`, ({ request }) => {
    const ageGroup = new URL(request.url).searchParams.get("ageGroup") as AgeGroup | null;
    const table = fixtures.itemsByAgeGroup;
    return HttpResponse.json(table[ageGroup ?? "유소년"] ?? table["유소년"]);
  }),

  http.get<PathParams>(`${BASE}/profiles/:profileId/fitness-tests/latest`, ({ params }) => {
    const profileId = String(params.profileId);
    const found = db.latest[profileId];
    // 이력이 없어도 404 가 아니다. 빈 모양을 돌려준다
    return HttpResponse.json({
      ...(found ?? fixtures.latestByProfile[DEMO.mom]),
      // ▲ 서버가 아직 안 돌려주는 값. 있으면 화면이 "지금 몸" 을 그린다
      ...(db.body[profileId] ?? {}),
    });
  }),

  http.post<PathParams>(
    `${BASE}/profiles/:profileId/fitness-tests`,
    async ({ params, request }) => {
      const profileId = String(params.profileId);
      const profile = db.profiles.profiles.find((p) => p.profileId === profileId);
      if (!profile) return fail(404, "NOT_FOUND", "프로필이 없습니다");

      // 서버 검증 세 갈래를 그대로 구현한다
      if (!profile.measurable && profile.ageGroup === "유아기") {
        return fail(422, "NOT_MEASURABLE", "만 4세 미만은 측정 대상이 아닙니다");
      }
      if (!profile.consentGiven) {
        return fail(422, "CONSENT_REQUIRED", "보호자 동의가 필요합니다");
      }

      const body = (await request.json()) as {
        testedOn: string;
        source: string;
        heightCm?: number;
        weightKg?: number;
        items: { itemCode: string; value: number }[];
      };
      // 같이 적어 온 키 · 몸무게는 들고 있다가 latest 로 돌려준다
      if (body.heightCm && body.weightKg) {
        db.body[profileId] = { heightCm: body.heightCm, weightKg: body.weightKg };
      }
      const measured = (body.items ?? []).filter((i) => Number.isFinite(i.value));
      if (measured.length === 0) return fail(400, "NO_ITEMS", "항목이 없습니다");
      // 혈압은 입력으로 받지 않는다
      if (measured.some((i) => i.itemCode === "005" || i.itemCode === "006")) {
        return fail(400, "ITEM_NOT_ALLOWED", "허용되지 않는 항목입니다");
      }

      const catalogue =
        fixtures.itemsByAgeGroup[profile.ageGroup] ?? fixtures.itemsByAgeGroup["유소년"];

      const items = measured.map((entry) => {
        const meta = catalogue?.items.find((i) => i.itemCode === entry.itemCode);
        // 실제로는 국민체력100 규준표와 대조한다. 목에서는 그럴듯한 값을 만든다
        const percentile = Math.max(1, Math.min(99, Math.round(20 + (entry.value % 70))));
        return {
          itemCode: entry.itemCode,
          itemLabel: meta?.itemLabel ?? entry.itemCode,
          unit: meta?.unit ?? "",
          value: entry.value,
          percentile,
          grade: gradeOf(percentile),
          band: bandOf(percentile),
          topPercentText: `상위 ${100 - percentile}%`,
        };
      });

      const sorted = [...items].sort((a, b) => a.percentile - b.percentile);
      const factorOf = (code: string) =>
        catalogue?.items.find((i) => i.itemCode === code)?.factor ?? "유연성";

      const result: Concrete<FitnessTestResult> = {
        fitnessTestId: uuid(),
        testedOn: body.testedOn,
        items,
        weakest: {
          factor: factorOf(sorted[0].itemCode),
          itemCode: sorted[0].itemCode,
          percentile: sorted[0].percentile,
        },
        strongest: {
          factor: factorOf(sorted[sorted.length - 1].itemCode),
          itemCode: sorted[sorted.length - 1].itemCode,
          percentile: sorted[sorted.length - 1].percentile,
        },
        disclaimer: fixtures.fitnessMap.disclaimer,
      };

      const overall = Math.round(items.reduce((s, i) => s + i.percentile, 0) / items.length);
      db.latest[profileId] = {
        ...result,
        radar: fixtures.latestByProfile[DEMO.kid].radar,
        coachDirection: sorted[0].percentile > 75 ? "STRENGTHEN" : "GROWTH",
      };

      const member = db.fitnessMap.members.find((m) => m.profileId === profileId);
      if (member) {
        member.headline = `${profile.ageGroup} 상위 ${100 - overall}%`;
        member.latest = {
          fitnessTestId: result.fitnessTestId,
          testedOn: body.testedOn,
          overallPercentile: overall,
          weakest: result.weakest,
          strongest: result.strongest,
          coachDirection: sorted[0].percentile > 75 ? "STRENGTHEN" : "GROWTH",
        };
      }

      return HttpResponse.json(result, { status: 201 });
    },
  ),

  http.get(`${BASE}/families/:familyId/fitness-map`, () => HttpResponse.json(db.fitnessMap)),

  http.post(`${BASE}/profiles/:profileId/predictions`, () =>
    HttpResponse.json(fixtures.prediction, { status: 201 }),
  ),
];

/* ─── 코치 — 승인 게이트 ───────────────────────────────────── */

const coaching = [
  http.post(`${BASE}/families/:familyId/coach/runs`, async () => {
    /* 제안도 오늘이 속한 주로 만든다. 픽스처 날짜를 그대로 쓰면 지난주 제안이 뜬다 */
    const week = thisWeek();
    db.coachRun = {
      ...structuredClone(fixtures.coachRun),
      weekStart: week.weekStart,
      proposals: structuredClone(fixtures.coachRun.proposals ?? []).map((p) => ({
        ...p,
        startDate: week.weekStart,
        endDate: week.weekEnd,
      })),
    };
    saveCoachRun();
    // 실행은 비동기다. 접수만 하고 202 를 준다
    return HttpResponse.json(
      { coachRunId: db.coachRun.coachRunId, status: "RUNNING", pollAfterMs: 1500 },
      { status: 202 },
    );
  }),

  http.get<PathParams>(`${BASE}/coach/runs/:runId`, () => HttpResponse.json(db.coachRun)),

  /**
   * ▲ 서버에 아직 없다. 제안 모양으로 답한다.
   * 기기에 든 runId 가 없으면 이번 주 제안을 영영 못 찾아서, 승인 게이트가
   * 통째로 사라진다 — 이 서비스의 핵심 주장을 보여 줄 화면이 없어진다.
   */
  http.get(`${BASE}/families/:familyId/coach/runs/latest`, () => HttpResponse.json(db.coachRun)),

  /**
   * ★ 미션이 만들어지는 유일한 지점.
   * 승인 전까지 db.missions 는 0건이고, 그게 이 서비스의 핵심 주장이다.
   */
  http.post(`${BASE}/coach/runs/:runId/approve`, () => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
    if (db.coachRun.status === "APPROVED")
      return fail(409, "ALREADY_APPROVED", "이미 승인했습니다");
    if (db.coachRun.status !== "AWAITING_APPROVAL") {
      return fail(409, "INVALID_STATE", "승인할 수 없는 상태입니다");
    }

    db.coachRun.status = "APPROVED";
    /* 지난 회차에서 승인해 둔 미션은 그대로 두고 **이번 회차 것만 더한다** */
    const born = structuredClone(fixtures.missionsAfterApproval.missions).map((m) => ({
      ...m,
      coachRunId: db.coachRun.coachRunId,
      startDate: thisWeek().weekStart,
      endDate: thisWeek().weekEnd,
    }));
    db.missions = [...db.missions, ...born];
    db.coachRun.missionCount = born.length;
    saveMissions();
    saveCoachRun();
    return HttpResponse.json(fixtures.coachApprove);
  }),

  http.post(`${BASE}/coach/runs/:runId/reject`, async ({ request }) => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
    if (db.coachRun.status !== "AWAITING_APPROVAL") {
      return fail(409, "INVALID_STATE", "처리할 수 없는 상태입니다");
    }

    const { reason } = (await request.json()) as { reason?: string };
    db.coachRun.status = "REJECTED";
    db.coachRun.rejectedReason = reason ?? null;
    saveCoachRun();
    // 거절해도 미션은 0건 유지
    return HttpResponse.json({
      coachRunId: db.coachRun.coachRunId,
      status: "REJECTED",
      rejectedReason: reason ?? null,
      missionCount: 0,
    });
  }),

  http.post(`${BASE}/coach/chat`, async ({ request }) => {
    const { question, conversationId, profileId } = (await request.json()) as {
      question: string;
      conversationId?: string;
      profileId?: string;
    };
    /* 누구에 대해 묻는지가 답을 가른다. 목에서는 이름을 붙여 그걸 보여 준다 */
    const about = db.profiles.profiles.find((p) => p.profileId === profileId);
    // RAG 검색과 생성에 걸리는 시간. 스켈레톤이 실제로 보이게 하려고 넣었다
    await new Promise((r) => setTimeout(r, 900));

    const topic = topicOf(question);
    const week = thisWeek();
    return HttpResponse.json({
      // 이어지는 대화는 같은 id 를 돌려준다. 매번 새로 주면 대화가 끊긴다
      conversationId: conversationId ?? uuid(),
      messageId: uuid(),
      answer: about?.name ? `${about.name} 기준으로 보면, ${topic.answer}` : topic.answer,
      // 근거 없는 답변은 버그로 본다. 목에서도 항상 채운다
      citations: topic.citations,
      refused: false,
      refusalReason: null,
      /*
        ▲ 백엔드에 요청해 둔 것 — 대화 중 미션 제안.
        값이 그대로 POST /families/{id}/missions 본문이 되어, 부모가 카드의
        버튼 한 번으로 미션을 만들 수 있다. 목에서는 운동·시간을 물으면 붙여 준다.
      */
      suggestion: topic.mission
        ? {
            ...topic.mission,
            startDate: today(),
            endDate: week.weekEnd,
            /* 물어본 사람이 빠진 제안을 내놓지 않는다 */
            participantProfileIds: [
              ...new Set([
                ...(profileId ? [profileId] : []),
                ...topic.mission.participantProfileIds,
              ]),
            ],
          }
        : null,
    });
  }),
];

/**
 * 물음에 맞는 답을 고른다.
 *
 * 전에는 물음을 그대로 앞에 붙이고("… 에 대해,") 늘 같은 문장을 돌려줬다.
 * 무엇을 물어도 같은 답이 오면 대화라기보다 자동응답기로 보인다 — 진짜
 * 코치가 무엇을 하는지 보여 주려면 답이 물음을 따라 달라져야 한다.
 */
function topicOf(question: string) {
  const q = question ?? "";

  if (/윗몸|코어|근력|팔굽|스쿼트|플랭크/.test(q)) {
    return {
      answer:
        "윗몸일으키기가 힘들면 바닥에서 완전히 일어나지 않아도 됩니다. 등을 절반만 들었다 내리는 동작으로 열 번씩 세 세트부터 시작해 보세요. 목을 손으로 당기지 않는 것이 중요합니다.",
      citations: [
        {
          index: 1,
          sourceLabel: "유소년 근지구력 운동처방",
          excerpt: "부분 윗몸말아올리기는 경추 부담 없이 복부 근지구력을 키우는 데 효과적입니다.",
          url: null,
        },
      ],
      mission: {
        title: "코어 10분 놀이",
        targetMetric: "TIMER_MINUTES",
        targetValue: 30,
        videoId: "sample00009",
        videoTitle: "아이와 마주 보고 하는 코어 놀이",
        participantProfileIds: [DEMO.kid, DEMO.mom],
        rationale: "마주 보고 하면 자세를 서로 봐 줄 수 있어 처음 배울 때 좋습니다.",
      },
    };
  }

  if (/층간|소음|아래층|조용/.test(q)) {
    return {
      answer:
        "뛰지 않고도 심박수를 올릴 수 있습니다. 제자리에서 무릎을 들어 올리는 동작과 팔 벌려 높이뛰기 대신 옆으로 발 내딛기를 섞으면 바닥 충격이 크게 줄어듭니다.",
      citations: [
        {
          index: 1,
          sourceLabel: "가정 내 유산소 운동처방",
          excerpt: "착지 충격이 적은 동작으로도 중강도 심박수(최대심박수의 64~76%)에 도달합니다.",
          url: null,
        },
      ],
      mission: {
        title: "층간소음 없는 유산소",
        targetMetric: "TIMER_MINUTES",
        targetValue: 40,
        videoId: "sample00006",
        videoTitle: "온 가족 층간소음 없는 유산소 10분",
        participantProfileIds: [DEMO.kid, DEMO.mom],
        rationale: "소음이 적어 저녁에도 할 수 있습니다.",
      },
    };
  }

  if (/유연|스트레칭|굽히|뻣뻣/.test(q)) {
    return {
      answer:
        "유연성은 세게 한 번보다 짧게 자주가 낫습니다. 한 자세를 15~30초 유지하고 반동을 주지 않는 것이 핵심이며, 주 4회 이상이면 몇 주 안에 차이가 보입니다.",
      citations: [
        {
          index: 1,
          sourceLabel: "유소년 유연성 운동처방",
          excerpt: "정적 스트레칭은 1회 15~30초 유지, 주 4회 이상 반복 시 개선 폭이 큽니다.",
          url: null,
        },
      ],
      mission: {
        title: "저녁 10분 스트레칭",
        targetMetric: "TIMER_MINUTES",
        targetValue: 40,
        videoId: "sample00002",
        videoTitle: "가족이 함께하는 거실 5분 스트레칭",
        participantProfileIds: [DEMO.kid, DEMO.mom],
        rationale: "유연성이 또래 평균보다 낮아 짧게 자주 하는 편이 좋습니다.",
      },
    };
  }

  if (/주말|시간|분|바쁘|퇴근|언제/.test(q)) {
    return {
      answer:
        "주말 30분 한 번이 평일 매일보다 지키기 쉽습니다. 처음에는 15분으로 잡고 아이가 끝까지 하면 늘리는 편이 좋습니다. 같이 하는 사람이 있으면 완주율이 눈에 띄게 올라갑니다.",
      citations: [
        {
          index: 1,
          sourceLabel: "가족 참여형 신체활동 지침",
          excerpt: "보호자가 함께 참여한 경우 아동의 주간 활동 지속률이 높게 나타났습니다.",
          url: null,
        },
      ],
      mission: {
        title: "주말 30분 같이 하기",
        targetMetric: "TIMER_MINUTES",
        targetValue: 30,
        videoId: "sample00002",
        videoTitle: "가족이 함께하는 거실 5분 스트레칭",
        participantProfileIds: [DEMO.kid, DEMO.mom],
        rationale: "평일보다 주말 한 번이 지키기 쉽습니다.",
      },
    };
  }

  return {
    answer:
      "국민체력100 측정 결과를 기준으로 답합니다. 어느 항목을 키우고 싶은지, 집에서 할 수 있는 시간이 얼마나 되는지 알려 주시면 더 맞는 운동을 찾아 드릴 수 있어요.",
    citations: [
      {
        index: 1,
        sourceLabel: "국민체력100 체력측정 안내",
        excerpt: "체력 요인별 측정 결과에 따라 권장 운동과 강도가 달라집니다.",
        url: null,
      },
    ],
    mission: null,
  };
}

/* ─── 미션 · 활동 · 영상 · 리포트 ──────────────────────────── */

const missions = [
  /**
   * scope 와 status 를 실제로 거른다.
   * 고정 목록만 돌려주면 탭을 눌러도 아무 일이 없고, 화면이 맞는지 알 수 없다.
   */
  http.get(`${BASE}/families/:familyId/missions`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") ?? "ALL";
    const status = params.get("status");
    const today = new Date().toISOString().slice(0, 10);

    const missions = db.missions.filter((m) => {
      const parts = m.participants ?? [];
      const allDone = parts.length > 0 && parts.every((p) => p.completed);

      // MINE = 내 계정의 프로필이 참여자, FAMILY = 참여자 2명 이상
      if (scope === "MINE" && !parts.some((p) => p.profileId === db.actingProfileId)) return false;
      if (scope === "FAMILY" && parts.length < 2) return false;

      if (status === "DONE") return allDone;
      if (status === "EXPIRED") return m.endDate < today && !allDone;
      if (status === "ACTIVE") return m.endDate >= today && !allDone;
      return true;
    });

    return HttpResponse.json({ missions });
  }),

  http.post(`${BASE}/families/:familyId/missions`, async ({ request }) => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
    const body = (await request.json()) as {
      title: string;
      startDate: string;
      endDate: string;
      targetMetric: MissionRow["targetMetric"];
      targetValue: number;
      videoId?: string;
      participantProfileIds: string[];
    };
    const mission: MissionRow = {
      missionId: uuid(),
      title: body.title,
      origin: "MANUAL",
      coachRunId: null,
      targetMetric: body.targetMetric,
      targetValue: body.targetValue,
      // 걸음수는 서버가 확인할 수 없다. 영상 재생률과 타이머만 서버가 안다
      serverVerifiable: body.targetMetric !== "STEPS",
      startDate: body.startDate,
      endDate: body.endDate,
      rationale: null,
      video: null,
      participants: body.participantProfileIds.map((id) => ({
        profileId: id,
        name: db.profiles.profiles.find((p) => p.profileId === id)?.name ?? "",
        progress: 0,
        completed: false,
        verifiedBy: null,
        needsGuardianCheck: false,
      })),
    };
    db.missions.push(mission);
    saveMissions();
    return HttpResponse.json(mission, { status: 201 });
  }),

  http.post(`${BASE}/missions/:missionId/activity/timer`, async ({ request }) => {
    const body = (await request.json()) as { activeMinutes: number };
    // 서버가 진짜로 아는 값이다
    return HttpResponse.json({
      activityDate: new Date().toISOString().slice(0, 10),
      source: "TIMER",
      serverVerified: true,
      totalActiveMinutes: body.activeMinutes,
      missionProgress: Math.min(1, body.activeMinutes / 45),
      missionCompleted: body.activeMinutes >= 45,
    });
  }),

  http.post(`${BASE}/missions/:missionId/activity/steps`, async ({ request }) => {
    const body = (await request.json()) as { steps: number };
    // 자기 신고다. 목표를 넘겨도 보호자 확인 전에는 완료가 아니다
    return HttpResponse.json({
      source: "MANUAL",
      serverVerified: false,
      verifiedBy: "SELF_REPORT",
      missionProgress: Math.min(1, body.steps / 8000),
      missionCompleted: false,
      needsGuardianCheck: body.steps >= 8000,
    });
  }),

  http.post(`${BASE}/missions/:missionId/participants/:profileId/confirm`, ({ params }) => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
    return HttpResponse.json({
      missionId: String(params.missionId),
      profileId: String(params.profileId),
      completed: true,
      verifiedBy: "SELF_REPORT",
      confirmedBy: db.actingProfileId,
      verifiedAt: new Date().toISOString(),
    });
  }),

  /**
   * 주간 기록은 **지금 서버 상태에서 센다.**
   *
   * 픽스처를 그대로 돌려주면 미션을 하고 칭찬을 주고받아도 화면은 늘 0분이라
   * "이번 주는 이제 시작이에요" 에 머문다. 시연에서 방금 한 일이 다음 화면에
   * 안 보이는 게 가장 나쁘다.
   */
  http.get(`${BASE}/families/:familyId/report/weekly`, () => {
    const week = thisWeek();
    const inWeek = (date: string | null | undefined) =>
      Boolean(date) && date! >= week.weekStart && date! <= week.weekEnd;

    const missions = db.missions.filter((m) => inWeek(m.endDate));
    const members = db.profiles.profiles.map((profile) => {
      const mine = missions.flatMap((m) =>
        (m.participants ?? [])
          .filter((p) => p.profileId === profile.profileId)
          .map((p) => ({ m, p })),
      );
      /* 진행률 × 목표 분. 걸음수 미션은 분으로 세지 않는다 */
      const minutes = mine.reduce(
        (sum, { m, p }) =>
          sum +
          (m.targetMetric === "TIMER_MINUTES"
            ? Math.round((p.progress ?? 0) * (m.targetValue ?? 0))
            : 0),
        0,
      );
      const verified = mine.reduce(
        (sum, { m, p }) =>
          sum +
          (m.targetMetric === "TIMER_MINUTES" && serverKnows(p.verifiedBy)
            ? Math.round((p.progress ?? 0) * (m.targetValue ?? 0))
            : 0),
        0,
      );
      return {
        profileId: profile.profileId,
        name: profile.name,
        activeMinutes: minutes,
        verifiedMinutes: verified,
        completedMissions: mine.filter(({ p }) => p.completed).length,
      };
    });

    return HttpResponse.json({
      ...week,
      summary: null,
      missionStats: {
        total: missions.length,
        completed: missions.filter((m) => (m.participants ?? []).every((p) => p.completed)).length,
      },
      members,
      cheerCount: db.cheers.filter((c) => inWeek(c.createdAt.slice(0, 10)) && c.message).length,
    });
  }),
];

const videos = [
  http.get(`${BASE}/videos`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const list = params.get("list") ?? "ALL";
    const ageGroup = params.get("ageGroup");

    let result = db.videos;
    if (list === "FAVORITES") result = result.filter((v) => v.favorited);
    if (list === "RECENT") result = result.filter((v) => v.maxProgress !== null);
    // 연령 안전 필터. 라벨 연령 범위와 겹치는 영상만 나간다.
    // 라벨이 없는 영상은 아이 연령대에 아예 나가지 않는다 — 무엇이 나올지 모르기 때문이다
    if (ageGroup) {
      const [from, to] = AGE_RANGE[ageGroup] ?? [0, 99];
      result = result.filter((v) => {
        const label = v.label;
        if (label?.ageFrom == null && label?.ageTo == null) return false;
        return (label.ageFrom ?? 0) <= to && (label.ageTo ?? 99) >= from;
      });
    }
    return HttpResponse.json({ videos: result, nextCursor: null });
  }),

  http.post<PathParams>(`${BASE}/videos/:videoId/favorite`, async ({ params, request }) => {
    const { favorited } = (await request.json()) as { favorited: boolean };
    const video = db.videos.find((v) => v.videoId === params.videoId);
    if (!video) return fail(404, "VIDEO_NOT_FOUND", "영상이 없습니다");
    video.favorited = favorited;
    return HttpResponse.json({
      videoId: video.videoId,
      profileId: db.actingProfileId,
      favorited,
      favoritedAt: favorited ? new Date().toISOString() : null,
    });
  }),

  http.post<PathParams>(`${BASE}/videos/:videoId/progress`, async ({ params, request }) => {
    const body = (await request.json()) as { progress: number };
    const video = db.videos.find((v) => v.videoId === params.videoId);
    const previous = video?.maxProgress ?? 0;
    const maxProgress = Math.max(previous, body.progress);
    if (video) video.maxProgress = maxProgress;

    // 처음 기준을 넘을 때만 적립한다. 두 번 적립되지 않는다
    const justCompleted = !isVideoDone(previous) && isVideoDone(maxProgress);
    return HttpResponse.json({
      maxProgress,
      completed: isVideoDone(maxProgress),
      creditedMinutes: justCompleted ? Math.ceil((video?.durationSec ?? 0) / 60) : 0,
      verifiedBy: isVideoDone(maxProgress) ? "VIDEO_PROGRESS" : null,
      missionProgress: null,
    });
  }),
];

export const handlers = [...authGate, ...identity, ...fitness, ...coaching, ...missions, ...videos];
