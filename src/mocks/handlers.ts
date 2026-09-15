/**
 * MSW 목 서버 — 백엔드가 안 떠 있을 때 쓴다.
 *
 * 응답은 **실제 백엔드에서 받아온 것**이다(`fixtures.json`).
 * 손으로 지어내면 필드명이 어긋나고, 그 어긋남은 화면을 다 만든 뒤에야 드러난다.
 *
 * 새로 받으려면 백엔드를 띄우고:
 *   npm run api:types      # 타입
 *   (fixtures 는 scripts/capture-fixtures.mjs)
 *
 * 고정 JSON 만 돌려주지 않는다. 화면이 마주칠 **규칙**을 구현한다.
 *   - 승인 전에는 미션이 0건이다
 *   - 자녀 계정은 승인할 수 없다
 *   - 측정 항목 0개 · 만 4세 미만 · 동의 없음은 각각 다른 코드로 거절한다
 */
import { HttpResponse, http, type PathParams } from "msw";

import type {
  AgeGroup,
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
  WeeklyReport,
} from "@/lib/api/types";

import fixturesJson from "./fixtures.json";

/**
 * 픽스처의 모양.
 *
 * fixtures.json 은 실제 응답이라 TypeScript 가 값에서 타입을 지나치게 좁게 추론한다
 * (`rejectedReason: null` 이면 타입이 `null` 이 된다). 목 서버는 그 값을 바꿔 가며 쓰므로
 * 계약 타입으로 다시 붙여 준다. 백엔드가 필드를 바꾸면 여기서 타입 에러가 난다.
 */
/**
 * 선택 표시(`?`)만 걷어낸다.
 *
 * 백엔드 springdoc 이 `required` 를 내보내지 않아서 생성된 스키마는 **모든 필드가
 * 선택**이다. 실제 응답에는 다 들어 있는데도 목 서버 코드마다 `?.` 와 `?? []` 가 붙는다.
 * 픽스처는 진짜 응답이므로 여기서만 "다 있다" 고 못박는다.
 *
 * `null` 은 그대로 둔다 — `rejectedReason: null` 처럼 의미가 있는 null 이 있다.
 */
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
  report: WeeklyReport;
  prediction: PredictionResult;
}

const fixtures = fixturesJson as unknown as Concrete<Fixtures>;

/** 목 서버가 만들고 고치는 값들. 응답과 같은 모양이어야 화면이 진짜처럼 돈다 */
type Profile = Concrete<ProfileSummary>;
type MapMember = Concrete<FitnessMap>["members"][number];
type MissionRow = Concrete<Mission>;

const BASE = "/api/v1";

export const DEMO = {
  familyId: "00000000-0000-4000-8000-000000000010",
  mom: "00000000-0000-4000-8000-000000000011",
  kid: "00000000-0000-4000-8000-000000000012",
  dad: "00000000-0000-4000-8000-000000000013",
} as const;

/* ─── 서버 상태 ────────────────────────────────────────────── */

/** 새로고침하면 초기 상태로 돌아간다. 시연 중 되돌리기 쉽게 하려는 의도다 */
const db = {
  profiles: structuredClone(fixtures.profiles),
  fitnessMap: structuredClone(fixtures.fitnessMap),
  latest: structuredClone(fixtures.latestByProfile),
  coachRun: structuredClone(fixtures.coachRun),
  /** 승인 전에는 비어 있다. 승인 핸들러가 채운다 */
  missions: [] as MissionRow[],
  videos: structuredClone(fixtures.videos.videos),
  /** 지금 로그인해서 보고 있는 사람. 승인 권한 테스트를 위해 바꿀 수 있다 */
  actingProfileId: DEMO.mom as string,
};

export function setActingProfile(profileId: string) {
  db.actingProfileId = profileId;
}

function acting(): Profile | undefined {
  return db.profiles.profiles.find((p) => p.profileId === db.actingProfileId);
}

/** 서버와 같은 봉투 모양으로 실패를 돌려준다 */
function fail(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
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

const identity = [
  http.get(`${BASE}/me`, () => HttpResponse.json(fixtures.me)),

  http.post(`${BASE}/auth/dev-login`, () =>
    HttpResponse.json({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      ...fixtures.me,
    }),
  ),

  http.get(`${BASE}/families/:familyId/profiles`, () => HttpResponse.json(db.profiles)),

  http.post(`${BASE}/families/:familyId/profiles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const birthDate = String(body.birthDate ?? "2020-01-01");
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
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
    return HttpResponse.json(
      { cheerId: uuid(), ...body, createdAt: new Date().toISOString() },
      { status: 201 },
    );
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

/* ─── 측정 ─────────────────────────────────────────────────── */

const fitness = [
  http.get(`${BASE}/fitness/items`, ({ request }) => {
    const ageGroup = new URL(request.url).searchParams.get("ageGroup") as AgeGroup | null;
    const table = fixtures.itemsByAgeGroup;
    return HttpResponse.json(table[ageGroup ?? "유소년"] ?? table["유소년"]);
  }),

  http.get<PathParams>(`${BASE}/profiles/:profileId/fitness-tests/latest`, ({ params }) => {
    const found = db.latest[String(params.profileId)];
    // 이력이 없어도 404 가 아니다. 빈 모양을 돌려준다
    return HttpResponse.json(found ?? fixtures.latestByProfile[DEMO.mom]);
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
        items: { itemCode: string; value: number }[];
      };
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
    db.coachRun = structuredClone(fixtures.coachRun);
    // 실행은 비동기다. 접수만 하고 202 를 준다
    return HttpResponse.json(
      { coachRunId: db.coachRun.coachRunId, status: "RUNNING", pollAfterMs: 1500 },
      { status: 202 },
    );
  }),

  http.get<PathParams>(`${BASE}/coach/runs/:runId`, () => HttpResponse.json(db.coachRun)),

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
    db.missions = structuredClone(fixtures.missionsAfterApproval.missions);
    db.coachRun.missionCount = db.missions.length;
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
    // 거절해도 미션은 0건 유지
    return HttpResponse.json({
      coachRunId: db.coachRun.coachRunId,
      status: "REJECTED",
      rejectedReason: reason ?? null,
      missionCount: 0,
    });
  }),

  http.post(`${BASE}/coach/chat`, async ({ request }) => {
    const { question, conversationId } = (await request.json()) as {
      question: string;
      conversationId?: string;
    };
    // RAG 검색과 생성에 걸리는 시간. 스켈레톤이 실제로 보이게 하려고 넣었다
    await new Promise((r) => setTimeout(r, 900));
    return HttpResponse.json({
      // 이어지는 대화는 같은 id 를 돌려준다. 매번 새로 주면 대화가 끊긴다
      conversationId: conversationId ?? uuid(),
      messageId: uuid(),
      answer: `${question.slice(0, 20)}… 에 대해, 아이 연령대에 맞춰 정적 스트레칭부터 시작하는 편이 좋습니다. 하루 5분, 주 4회 정도가 적당합니다.`,
      // 근거 없는 답변은 버그로 본다. 목에서도 항상 채운다
      citations: [
        {
          index: 1,
          sourceLabel: "유소년 유연성 운동처방",
          excerpt: "정적 스트레칭은 1회 15~30초 유지, 주 4회 이상 반복 시 개선 폭이 큽니다.",
          url: null,
        },
      ],
      refused: false,
      refusalReason: null,
    });
  }),
];

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

  http.get(`${BASE}/families/:familyId/report/weekly`, () => HttpResponse.json(fixtures.report)),
];

const videos = [
  http.get(`${BASE}/videos`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const list = params.get("list") ?? "ALL";
    const ageGroup = params.get("ageGroup");

    let result = db.videos;
    if (list === "FAVORITES") result = result.filter((v) => v.favorited);
    if (list === "RECENT") result = result.filter((v) => v.maxProgress !== null);
    // 연령 안전 필터. 라벨 없는 영상은 아이 연령대에 나가지 않는다
    if (ageGroup === "유소년") {
      result = result.filter(
        (v) => v.label?.ageFrom != null && v.label.ageFrom <= 12 && (v.label.ageTo ?? 99) >= 7,
      );
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

    // 최초로 0.9 를 넘을 때만 적립한다. 두 번 적립되지 않는다
    const justCompleted = previous < 0.9 && maxProgress >= 0.9;
    return HttpResponse.json({
      maxProgress,
      completed: maxProgress >= 0.9,
      creditedMinutes: justCompleted ? Math.ceil((video?.durationSec ?? 0) / 60) : 0,
      verifiedBy: maxProgress >= 0.9 ? "VIDEO_PROGRESS" : null,
      missionProgress: null,
    });
  }),
];

export const handlers = [...identity, ...fitness, ...coaching, ...missions, ...videos];
