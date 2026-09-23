/** MSW 목 서버 — 백엔드가 안 떠 있을 때 쓴다. */
import { HttpResponse, http, type PathParams } from "msw";

import type { AgeGroup, FitnessTestResult, ItemResult, LatestFitnessTest } from "@/lib/api/types";

import { isVideoDone } from "@/lib/mission";
import { ageOf, toDateString } from "@/lib/today";

import {
  BASE,
  DEMO,
  acting,
  bandOf,
  db,
  fail,
  fixtures,
  saveCheers,
  saveFamily,
  saveMissions,
  setActingProfile,
  setStage,
  uuid,
  type Concrete,
  type MapMember,
  type MissionRow,
  type Profile,
} from "./db";

import { clips } from "./clips";
import { coaching } from "./coach";
import { history } from "./history";
import { progress } from "./progress";

export { DEMO, setActingProfile } from "./db";

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

/** 개발용 계정 셋. 로그인 화면에서 고르는 것과 같은 순서다 */
const CLAIM_ID = "demo-newcomer";
const FRESH_ID = "demo-fresh";

/** 초대를 기다리는 계정 — 부모가 낸 자리에 붙는다 */
const CLAIM_ME = {
  userId: "00000000-0000-4000-8000-000000000002",
  nextStep: "CLAIM",
  profiles: [],
};

/** 가족이 아예 없는 계정 — 여기서 `POST /families` 로 간다 */
const FRESH_ME = {
  userId: "00000000-0000-4000-8000-000000000003",
  nextStep: "CREATE_FAMILY",
  profiles: [],
};

/**
 * 어떤 계정으로 들어왔나에 따라 단계를 정하고 토큰을 준다.
 *
 * 로그인 응답에 `/me` 와 같은 모양을 얹어 준다 — 화면이 들어오자마자
 * 어디로 갈지 알아야 스플래시에서 한 번 더 왕복하지 않는다.
 */
function signIn(providerUserId: string | undefined) {
  const token = { accessToken: "mock-access-token", refreshToken: "mock-refresh-token" };

  if (providerUserId === CLAIM_ID) {
    setStage("claim");
    return { ...token, ...CLAIM_ME };
  }
  if (providerUserId === FRESH_ID) {
    setStage("fresh");
    return { ...token, ...FRESH_ME };
  }
  setStage("home");
  setActingProfile(DEMO.mom);
  return { ...token, ...fixtures.me };
}

/**
 * 가족을 새로 만든다.
 *
 * **서준이네 데이터를 갈아 끼운다.** 안 그러면 방금 가입한 사람이 남의 집
 * 기록·미션·칭찬을 자기 것으로 본다. 새 가족은 말 그대로 빈 집이어야 한다.
 */
function startFamily(familyName: string, owner: Profile) {
  db.profiles = {
    familyId: owner.familyId,
    familyName,
    profiles: [owner],
  } as typeof db.profiles;
  db.fitnessMap = {
    familyId: owner.familyId,
    familyName,
    disclaimer: fixtures.fitnessMap.disclaimer,
    members: [mapMemberOf(owner)],
  } as typeof db.fitnessMap;
  db.missions = [];
  db.cheers = [];
  db.latest = {};
  db.body = {};
  db.hasCoachRun = false;
  saveMissions();
  saveCheers(db.cheers);
  saveFamily();
}

/** 프로필 하나를 체력 지도의 한 줄로 */
function mapMemberOf(profile: Profile): MapMember {
  return {
    profileId: profile.profileId,
    name: profile.name,
    role: profile.role,
    ageGroup: profile.ageGroup,
    sex: profile.sex,
    hasAccount: profile.hasAccount,
    supportMode: profile.supportMode,
    measurable: profile.measurable,
    consentRequired: profile.consentRequired,
    consentGiven: profile.consentGiven,
    headline: null,
    latest: null,
  } as MapMember;
}

const identity = [
  /** 지금 로그인한 계정이 관리하는 프로필. */
  http.get(`${BASE}/me`, () => {
    if (db.stage === "claim") return HttpResponse.json(CLAIM_ME);
    if (db.stage === "fresh") return HttpResponse.json(FRESH_ME);
    const me = acting();
    if (!me) return HttpResponse.json(fixtures.me);
    // 새로 만든 가족이면 픽스처가 아니라 지금 가족을 돌려준다
    if (me.profileId === DEMO.mom && db.profiles.familyId === DEMO.familyId) {
      return HttpResponse.json(fixtures.me);
    }
    return HttpResponse.json({
      userId: fixtures.me.userId,
      nextStep: "HOME",
      profiles: [me],
    });
  }),

  http.post(`${BASE}/auth/dev-login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { providerUserId?: string };
    return HttpResponse.json(signIn(body.providerUserId));
  }),

  /**
   * 구글에서 받은 인가코드를 토큰으로 바꾼다.
   *
   * 목에 이게 없어서 요청이 브라우저를 빠져나가 `localhost:8080` 으로 나갔다.
   * 시연에서는 **가족이 없는 새 계정**으로 본다 — 구글로 처음 들어온 사람이
   * 실제로 겪는 상태가 그거다.
   */
  http.post(`${BASE}/auth/google`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { authorizationCode?: string };
    if (!body.authorizationCode) {
      return fail(400, "INVALID_CODE", "인가코드가 없습니다");
    }
    return HttpResponse.json(signIn(FRESH_ID));
  }),

  /**
   * ★ 가족이 생기는 유일한 지점.
   *
   * 목에 이 길이 없어서 요청이 브라우저를 빠져나가 `localhost:8080` 으로 나갔다.
   * 그래서 지금까지 **처음 쓰는 사람의 경로가 한 번도 안 돌았다** — 시연 계정으로만
   * 앱이 돌고 있었다.
   */
  http.post(`${BASE}/families`, async ({ request }) => {
    const body = (await request.json()) as {
      familyName?: string;
      owner?: { name?: string; birthDate?: string; sex?: "M" | "F" };
    };
    const familyName = (body.familyName ?? "").trim();
    const name = (body.owner?.name ?? "").trim();
    if (!familyName || !name) {
      return fail(400, "INVALID_INPUT", "가족 이름과 내 이름이 필요합니다");
    }
    if (db.stage === "home") {
      return fail(409, "ALREADY_IN_FAMILY", "이미 가족에 속해 있습니다");
    }

    const age = ageOf(body.owner?.birthDate) ?? 30;
    const familyId = uuid();
    const owner: Profile = {
      profileId: uuid(),
      familyId,
      name,
      role: "PARENT",
      ageGroup: ageGroupOf(age),
      sex: body.owner?.sex ?? "F",
      hasAccount: true,
      inviteStatus: "NONE",
      // 참여 방식은 다음 화면에서 고른다. 서버가 미리 정하지 않는다
      supportMode: null,
      measurable: age >= 4,
      consentRequired: false,
      consentGiven: true,
    } as Profile;

    startFamily(familyName, owner);
    setStage("home");
    setActingProfile(owner.profileId);

    return HttpResponse.json({ familyId, familyName, ownerProfile: owner }, { status: 201 });
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
    saveFamily();
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

  /**
   * ▲ 서버에 아직 없다. 제안 모양으로 답한다.
   * 코드가 어느 **자리**인지 넣기 전에 보여 줘야, 받는 사람이 역할을 고를 수
   * 없다는 것이 화면에서 사실이 된다.
   */
  http.get<PathParams>(`${BASE}/invites/:claimCode`, ({ params }) => {
    if (String(params.claimCode).toUpperCase() !== "K7M2QT") {
      return fail(404, "CODE_NOT_FOUND", "코드를 찾을 수 없습니다");
    }
    const seat = db.profiles.profiles.find((p) => p.profileId === DEMO.dad);
    const inviter = db.profiles.profiles.find((p) => p.profileId === DEMO.mom);
    if (!seat) return fail(404, "CODE_NOT_FOUND", "코드를 찾을 수 없습니다");
    return HttpResponse.json({
      familyName: db.profiles.familyName,
      profileName: seat.name,
      role: seat.role,
      ageGroup: seat.ageGroup,
      invitedByName: inviter?.name ?? null,
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
    });
  }),

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
    setStage("home");
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
      saveFamily();
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

  /** ▲ 서버에 아직 없다. 운동할 수 있는 시간 */
  http.get<PathParams>(`${BASE}/profiles/:profileId/availability`, ({ params }) =>
    HttpResponse.json({
      profileId: String(params.profileId),
      slots: db.availability[String(params.profileId)] ?? [],
    }),
  ),

  http.put<PathParams>(`${BASE}/profiles/:profileId/availability`, async ({ params, request }) => {
    const me = acting();
    if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자만 바꿀 수 있습니다");
    const body = (await request.json()) as {
      slots?: { day: string; start: string; minutes: number }[];
    };
    const days = new Set(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
    const slots = (body.slots ?? []).filter(
      (s) =>
        days.has(s.day) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(s.start) &&
        s.minutes >= 5 &&
        s.minutes <= 120,
    );
    if (slots.length !== (body.slots ?? []).length) {
      return fail(400, "INVALID_SLOT", "요일 · 시각 · 시간 중 맞지 않는 값이 있습니다");
    }
    db.availability[String(params.profileId)] = slots;
    return HttpResponse.json({ profileId: String(params.profileId), slots });
  }),

  /** ▲ 서버에 아직 없다. 최근 회차가 먼저 온다 */
  http.get<PathParams>(`${BASE}/profiles/:profileId/fitness-tests`, ({ params }) =>
    HttpResponse.json({ tests: db.tests[String(params.profileId)] ?? [] }),
  ),

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
      // 레이더는 요인마다 그 요인을 잰 항목의 백분위. 안 잰 요인은 null 이다
      const radar = [...new Set((catalogue?.items ?? []).map((i) => i.factor))].map((factor) => ({
        factor,
        percentile: items.find((i) => factorOf(i.itemCode) === factor)?.percentile ?? null,
      }));
      db.latest[profileId] = {
        ...result,
        radar: radar as Concrete<LatestFitnessTest>["radar"],
        coachDirection: sorted[0].percentile > 75 ? "STRENGTHEN" : "GROWTH",
      };
      // 다시 재기는 덮어쓰기가 아니라 추가다(규칙 11)
      db.tests[profileId] = [
        {
          fitnessTestId: result.fitnessTestId,
          testedOn: body.testedOn,
          overallPercentile: overall,
          heightCm: body.heightCm ?? null,
          weightKg: body.weightKg ?? null,
        },
        ...(db.tests[profileId] ?? []),
      ];

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
    const today = toDateString(new Date());

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
      /** ▲ 서버에 아직 없다. 직접 짠 루틴의 칸들 */
      sessions?: unknown[];
    };
    if (!body.title || !(body.participantProfileIds ?? []).length) {
      return fail(400, "BAD_REQUEST", "이름과 하는 사람이 필요합니다");
    }
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
      ...(body.sessions?.length ? { sessions: body.sessions } : {}),
    } as MissionRow;
    db.missions.push(mission);
    saveMissions();
    return HttpResponse.json(mission, { status: 201 });
  }),

  http.post(`${BASE}/missions/:missionId/activity/timer`, async ({ request }) => {
    const body = (await request.json()) as { activeMinutes: number };
    // 서버가 진짜로 아는 값이다
    return HttpResponse.json({
      activityDate: toDateString(new Date()),
      source: "TIMER",
      serverVerified: true,
      totalActiveMinutes: body.activeMinutes,
      missionProgress: Math.min(1, body.activeMinutes / 45),
      missionCompleted: body.activeMinutes >= 45,
    });
  }),

  /**
   * 한 칸 끝냈다. ▲ 서버에 아직 없다 — `POST /missions/{id}/sessions/{position}/done`.
   *
   * 앱 안 타이머로 잰 시간이라 서버가 아는 값이다(`TIMER`). 영상을 끝까지 봤는지가
   * 아니라 **잡힌 시간 동안 따라 했는지**로 판정한다 — 영상은 동작 시범일 뿐이다(9/23 회의).
   */
  http.post<PathParams>(
    `${BASE}/missions/:missionId/sessions/:position/done`,
    async ({ params, request }) => {
      const body = (await request.json()) as { profileId: string; activeSeconds: number };
      const mission = db.missions.find((m) => m.missionId === String(params.missionId));
      if (!mission) return fail(404, "MISSION_NOT_FOUND", "미션이 없습니다");
      const sessions =
        (
          mission as unknown as {
            sessions?: {
              position: number;
              minutes?: number | null;
              completed?: boolean;
              verifiedBy?: string | null;
            }[];
          }
        ).sessions ?? [];
      const session = sessions.find((s) => s.position === Number(params.position));
      if (!session) return fail(404, "SESSION_NOT_FOUND", "그 칸이 없습니다");
      // 잡힌 시간의 절반도 안 했으면 끝낸 것으로 치지 않는다
      const planned = (session.minutes ?? 1) * 60;
      if ((body.activeSeconds ?? 0) < planned * 0.5) {
        return fail(422, "TOO_SHORT", "잡힌 시간의 절반도 하지 않았습니다");
      }

      const first = !session.completed;
      session.completed = true;
      session.verifiedBy = "TIMER";
      const total = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0) || 1;
      const done = sessions
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + (s.minutes ?? 0), 0);
      const allDone = sessions.every((s) => s.completed);
      const me = (mission.participants ?? []).find((p) => p.profileId === body.profileId);
      if (me) {
        me.progress = done / total;
        me.verifiedBy = "TIMER";
        if (allDone) me.completed = true;
      }
      saveMissions();

      return HttpResponse.json({
        position: session.position,
        verifiedBy: "TIMER",
        missionProgress: done / total,
        missionCompleted: allDone,
        // 두 번 눌러도 두 번 쌓이지 않는다
        xpGained: first ? 5 + (allDone ? 20 : 0) : 0,
      });
    },
  ),

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

export const handlers = [
  ...authGate,
  ...identity,
  ...fitness,
  ...coaching,
  ...missions,
  ...videos,
  ...history,
  ...progress,
  ...clips,
];
