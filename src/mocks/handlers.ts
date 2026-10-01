/** MSW 목 서버 — 백엔드가 안 떠 있을 때 쓴다. */
import { HttpResponse, http, type PathParams } from "msw";

import type { AgeGroup, FitnessTestResult, LatestFitnessTest } from "@/lib/api/types";

import { ageOf, toDateString } from "@/lib/today";

import {
  BASE,
  DEMO,
  acting,
  ageGroupOf,
  bandOf,
  gradeOf,
  mockCertification,
  db,
  fail,
  fixtures,
  forgetProfile,
  mapMemberOf,
  resetToDemo,
  saveCheers,
  saveExtra,
  saveFamily,
  saveMissions,
  setActingProfile,
  setStage,
  uuid,
  type Concrete,
  type MapMember,
  type MissionRow,
  type ParticipantRow,
  type Profile,
  participantOf,
  saveRestDays,
  sessionsOfRow,
  withMedia,
} from "./db";

import { clips } from "./clips";
import { coaching } from "./coach";
import { history } from "./history";
import { invites } from "./invites";
import { league } from "./league";
import { notifications } from "./notifications";
import { progress, progressOf } from "./progress";

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
const CLAIM_ID = "demo-parent-2";
const FRESH_ID = "demo-fresh";

/** 시연 가족의 두 보호자 계정 — `/me` 가 지금 들어온 사람의 것을 준다 */
const ACCOUNTS: Record<string, { userId: string; email: string }> = {
  [DEMO.mom]: { userId: "00000000-0000-4000-8000-000000000001", email: "eunyoung@example.com" },
  [DEMO.dad]: { userId: "00000000-0000-4000-8000-000000000002", email: "dohyun@example.com" },
};

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
 * 가족이 있는 계정의 다음 단계. 초대로 들어온 보호자가 참여 방식을 고르기 전에 앱을 닫았으면
 * 다시 열 때도 참여 방식으로(BE 와 같다)
 */
function nextStepOf(me: Profile): "SUPPORT_MODE" | "HOME" {
  return me.role === "PARENT" && me.inviteStatus === "CLAIMED" && me.supportMode == null
    ? "SUPPORT_MODE"
    : "HOME";
}

/**
 * 어떤 계정으로 들어왔나에 따라 단계를 정하고 토큰을 준다.
 *
 * 로그인 응답에 `/me` 와 같은 모양을 얹어 준다 — 화면이 들어오자마자
 * 어디로 갈지 알아야 스플래시에서 한 번 더 왕복하지 않는다.
 *
 * 초대 코드를 들고 와도 로그인은 코드를 쓰지 않는다(BE 와 같다). 가족이 없는 계정이면 nextStep 이 CLAIM 이고,
 * 가족이 있는 계정이면 코드와 상관없이 HOME 이다
 */
function signIn(providerUserId: string | undefined, claimCode?: string | null) {
  const token = { accessToken: "mock-access-token", refreshToken: "mock-refresh-token" };
  // 없는 코드를 넣은 횟수는 계정마다 센다
  db.claimMisses = 0;

  // 새 계정으로 만든 가족이 탭에 남아 있으면 서준이네로 되돌린다 — 시연 계정이 남의 집을 보지 않게.
  // 탈퇴하거나 내보내서 서준이네 식구가 빠졌어도 되돌린다. 다시 들어온 시연 계정은 식구 셋을 본다
  const demoIntact =
    db.profiles.familyId === DEMO.familyId &&
    [DEMO.mom, DEMO.kid, DEMO.dad].every((id) =>
      db.profiles.profiles.some((p) => p.profileId === id),
    );
  if (providerUserId !== FRESH_ID && !demoIntact) resetToDemo();
  if (providerUserId === CLAIM_ID) {
    // 이 탭에서 벌써 자리에 붙었으면 그 자리(도현)로 — 다시 들어올 때마다 코드를 묻지 않는다
    const seat = db.profiles.profiles.find((p) => p.profileId === DEMO.dad);
    if (seat?.inviteStatus === "CLAIMED") {
      setStage("home");
      setActingProfile(DEMO.dad);
      return { ...token, userId: CLAIM_ME.userId, nextStep: nextStepOf(seat), profiles: [seat] };
    }
    setStage("claim");
    return { ...token, ...CLAIM_ME };
  }
  if (providerUserId === FRESH_ID) {
    if (claimCode) {
      setStage("claim");
      return { ...token, ...FRESH_ME, nextStep: "CLAIM" };
    }
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
  db.tests = {};
  db.availability = {};
  db.body = {};
  db.hasCoachRun = false;
  // 새 가족은 쉬는 날도 리그도 처음부터 — 브론즈에서 시작한다
  db.restDays = [];
  db.leagueTier = "BRONZE";
  saveMissions();
  saveCheers(db.cheers);
  saveFamily();
  saveRestDays();
  saveExtra("latest", "tests", "availability", "body", "hasCoachRun", "leagueTier");
}

const identity = [
  /** 지금 로그인한 계정이 관리하는 프로필. */
  http.get(`${BASE}/me`, () => {
    if (db.stage === "claim") return HttpResponse.json(CLAIM_ME);
    if (db.stage === "fresh") return HttpResponse.json(FRESH_ME);
    const me = acting();
    if (!me) return HttpResponse.json(fixtures.me);
    // 지금 가족에서 — 픽스처를 돌려주면 참여 방식을 바꿔도 `/me` 는 옛 값을 말한다.
    // 계정은 지금 누구로 들어왔는지로 — 도현으로 들어와도 은영의 계정이 떴다
    const account = ACCOUNTS[me.profileId] ?? {
      userId: FRESH_ME.userId,
      email: "new-family@example.com",
    };
    return HttpResponse.json({
      userId: account.userId,
      nextStep: nextStepOf(me),
      profiles: [me],
      // ▲ 요청한 칸 — 설정의 「로그인 계정」
      email: account.email,
    });
  }),

  /** 액세스 토큰 새로 받기. 목은 토큰을 따지지 않으니 같은 모양으로 돌려준다 */
  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { refreshToken?: string };
    if (!body.refreshToken) return fail(401, "UNAUTHORIZED", "리프레시 토큰이 없습니다");
    return HttpResponse.json({ accessToken: "mock-access-token", refreshToken: body.refreshToken });
  }),

  http.post(`${BASE}/auth/dev-login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      providerUserId?: string;
      claimCode?: string | null;
    };
    return HttpResponse.json(signIn(body.providerUserId, body.claimCode));
  }),

  /**
   * 심사용 계정으로 들어간다. 토큰 없이 부르고, 본문 `{ kind }` 로 세 흐름 가운데 하나를 고른다.
   *
   *   FAMILY(본문이 없거나 kind 가 없을 때도)  체험 가족의 보호자로 홈에. 진짜 서버는 부를 때마다 새 계정과
   *                                          「체험 가족」 을 만든다. 목은 식구와 측정 기록이 다 차 있는 서준이네로 들어간다
   *   FRESH    가족이 없는 새 계정 — 개발용 「새 계정 · 가족 없음」 과 같다(nextStep CREATE_FAMILY)
   *   INVITED  가족이 없는 새 계정과, 체험 가족의 초대코드(`inviteCode`). 개발용 「초대받은 계정」 과 같게
   *            서준이네 아빠 자리 코드(K7M2QT)를 준다
   *
   * 모르는 kind 는 400.
   */
  http.post(`${BASE}/auth/review-login`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { kind?: unknown } | null;
    const kind = body?.kind ?? "FAMILY";
    if (kind === "FAMILY") return HttpResponse.json(signIn(undefined));
    if (kind === "FRESH") return HttpResponse.json(signIn(FRESH_ID));
    if (kind === "INVITED") return HttpResponse.json({ ...signIn(CLAIM_ID), inviteCode: "K7M2QT" });
    return fail(400, "INVALID_REQUEST", "kind 는 FAMILY, FRESH, INVITED 가운데 하나입니다");
  }),

  /**
   * 구글에서 받은 인가코드를 토큰으로 바꾼다.
   *
   * 목에 이게 없어서 요청이 브라우저를 빠져나가 `localhost:8080` 으로 나갔다.
   * 시연에서는 **가족이 없는 새 계정**으로 본다 — 구글로 처음 들어온 사람이
   * 실제로 겪는 상태가 그거다.
   */
  http.post(`${BASE}/auth/google`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      authorizationCode?: string;
      claimCode?: string | null;
    };
    if (!body.authorizationCode) {
      return fail(400, "INVALID_CODE", "인가코드가 없습니다");
    }
    return HttpResponse.json(signIn(FRESH_ID, body.claimCode));
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
      // 가족을 만든 첫 보호자가 오너다
      isOwner: true,
    } as Profile;

    startFamily(familyName, owner);
    setStage("home");
    setActingProfile(owner.profileId);

    return HttpResponse.json({ familyId, familyName, ownerProfile: owner }, { status: 201 });
  }),

  http.get(`${BASE}/families/:familyId/profiles`, () => HttpResponse.json(db.profiles)),

  http.post(`${BASE}/families/:familyId/profiles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const birthDate = String(body.birthDate ?? "");
    const age = ageOf(birthDate);
    if (!name || age == null) return fail(400, "INVALID_INPUT", "이름과 생일이 필요합니다");
    const consentRequired = age < 14;
    // 서버와 같게 — 만 14세 미만은 보호자(PARENT)로 들어올 수 없다(동의보다 먼저 본다)
    if (body.role === "PARENT" && consentRequired) {
      return fail(422, "UNDER_14_NOT_ALLOWED", "만 14세 미만은 보호자가 될 수 없습니다");
    }

    const consent = body.guardianConsent as
      { personalData?: boolean; healthData?: boolean } | undefined;
    // 서버가 동의를 자동으로 찍지 않는다. 둘 다 true 여야 저장된다
    if (consentRequired && !(consent?.personalData && consent?.healthData)) {
      return fail(422, "CONSENT_REQUIRED", "보호자 동의가 필요합니다");
    }

    const profile: Profile = {
      profileId: uuid(),
      familyId: db.profiles.familyId ?? DEMO.familyId,
      name,
      role: body.role === "PARENT" ? "PARENT" : "CHILD",
      ageGroup: ageGroupOf(age),
      ...(body.sex === "M" || body.sex === "F" ? { sex: body.sex } : {}),
      birthDate,
      hasAccount: false,
      inviteStatus: "NONE",
      supportMode: body.role === "PARENT" ? "CHEER_ONLY" : null,
      // 만 4세 미만은 규준 자체가 없다
      measurable: age >= 4,
      consentRequired,
      // 14세 미만은 위에서 동의를 받아야 여기까지 온다
      consentGiven: true,
      // 오너는 가족을 만든 사람 하나뿐이다. 나중에 더한 사람은 보호자여도 오너가 아니다
      isOwner: false,
    };
    db.profiles.profiles.push(profile);
    const mapMember: MapMember = {
      profileId: profile.profileId,
      name: profile.name,
      role: profile.role,
      ageGroup: profile.ageGroup,
      ...(profile.sex ? { sex: profile.sex } : {}),
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

  /**
   * 계정 탈퇴. BE 와 맞춘 규칙대로 답한다.
   *
   *   가족이 없는 계정       계정만 지운다
   *   아이 본인 계정         계정과 아이 프로필, 아이 기록을 지운다
   *   오너가 아닌 보호자     내 계정과 내 기록만 지운다. 가족과 아이 기록은 남는다
   *   오너                  다른 구성원이 있으면 409 FAMILY_NOT_EMPTY. 혼자면 가족까지 지운다
   *
   * 지운 뒤에는 가족이 없는 계정으로 둔다. 화면은 탈퇴하자마자 로그아웃하므로 이 상태를 다시 보지 않는다
   */
  http.delete(`${BASE}/me`, () => {
    const me = db.stage === "home" ? acting() : undefined;
    if (me?.isOwner) {
      const others = db.profiles.profiles.filter((p) => p.profileId !== me.profileId);
      if (others.length > 0) {
        return fail(409, "FAMILY_NOT_EMPTY", "다른 구성원을 모두 내보낸 뒤에 탈퇴할 수 있습니다");
      }
      // 가족이 통째로 없어진다. 목은 서준이네로 되돌려 둔다(다음에 들어오는 시연 계정이 볼 가족)
      resetToDemo();
    } else if (me?.profileId) {
      forgetProfile(me.profileId);
    }
    setStage("fresh");
    return new HttpResponse(null, { status: 204 });
  }),

  /**
   * 오너가 구성원을 내보낸다. 내보낸 사람의 프로필과 기록을 지운다.
   * 그 사람에게 계정이 있으면 계정은 남고 가족에서만 빠진다(목은 계정을 따로 들지 않는다)
   */
  http.delete<PathParams>(`${BASE}/families/:familyId/profiles/:profileId`, ({ params }) => {
    const me = acting();
    // 판정 차례는 BE 와 같다: 가족 없음 404, 오너 아님 403, 가족에 없는 프로필 404, 자기 자신 409
    if (!me || params.familyId !== db.profiles.familyId) {
      return fail(404, "FAMILY_NOT_FOUND", "가족을 찾을 수 없습니다");
    }
    if (!me.isOwner)
      return fail(403, "NOT_FAMILY_OWNER", "가족을 만든 사람만 구성원을 내보낼 수 있습니다");
    const target = db.profiles.profiles.find((p) => p.profileId === params.profileId);
    if (!target) return fail(404, "PROFILE_NOT_FOUND", "가족에 없는 프로필입니다");
    if (params.profileId === me.profileId) {
      return fail(409, "CANNOT_REMOVE_SELF", "자기 자신은 내보낼 수 없습니다");
    }
    forgetProfile(String(params.profileId));
    return new HttpResponse(null, { status: 204 });
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
    // 철회하면 그 순간부터 측정이 막힌다. 다시 주면 만 4세가 넘었는지로 — 연령대(유아기 0~6세)로 보면
    // 동의를 한 번 거둔 5살은 영영 못 잰다. 생일을 모르면 유아기만 막아 둔다(만 4세 미만일 수 있다)
    const age = ageOf((profile as Profile).birthDate);
    profile.measurable = given && (age != null ? age >= 4 : profile.ageGroup !== "유아기");
    syncMapMember(profile);
    saveFamily();

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
      // ▲ 계약에 칸이 없어 `emoji` 로 온다
      stickerId: body.stickerId ?? body.emoji ?? null,
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
    const params = new URL(request.url).searchParams;
    const to = params.get("toProfileId");
    // 서버와 같게 — missionId 로 좁혀 읽는다(「벌써 알렸나」)
    const mission = params.get("missionId");
    const cheers = db.cheers
      .filter((c) => (!to || c.toProfileId === to) && (!mission || c.missionId === mission))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return HttpResponse.json({ cheers });
  }),
];

function syncMapMember(profile: Profile) {
  const member = db.fitnessMap.members.find((m) => m.profileId === profile.profileId);
  if (!member) return;
  member.supportMode = profile.supportMode;
  member.hasAccount = profile.hasAccount;
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
      return fail(400, "INVALID_SLOT", "요일, 시각, 시간 가운데 맞지 않는 값이 있습니다");
    }
    db.availability[String(params.profileId)] = slots;
    saveExtra("availability");
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
        bodyFatPct?: number;
        waistCm?: number;
        items: { itemCode: string; value: number }[];
      };
      // 지난 날짜로 적은 회차는 이력에만 들어간다 — 가장 최근 회차가 「지금」 이다
      const newest = !((db.latest[profileId]?.testedOn ?? "") > body.testedOn);
      const measured = (body.items ?? []).filter((i) => Number.isFinite(i.value));
      if (measured.length === 0) return fail(400, "NO_ITEMS", "항목이 없습니다");
      // 혈압은 입력으로 받지 않는다
      if (measured.some((i) => i.itemCode === "005" || i.itemCode === "006")) {
        return fail(400, "ITEM_NOT_ALLOWED", "허용되지 않는 항목입니다");
      }
      // 같이 적어 온 키 · 몸무게는 들고 있다가 latest 로 돌려준다 — 검사를 다 지난 뒤에.
      // 전에는 거절한 회차의 키 · 몸무게가 먼저 남아 저장 안 된 값이 「지금 몸」 으로 떴다
      if (newest && body.heightCm && body.weightKg) {
        db.body[profileId] = { heightCm: body.heightCm, weightKg: body.weightKg };
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
      const overall = Math.round(items.reduce((s, i) => s + i.percentile, 0) / items.length);

      const result: Concrete<FitnessTestResult> = {
        fitnessTestId: uuid(),
        testedOn: body.testedOn,
        bodyFatPct: body.bodyFatPct ?? null,
        waistCm: body.waistCm ?? null,
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
        certification: mockCertification(
          profile.ageGroup,
          (profile as Profile).sex ?? "F",
          items.map((i) => i.itemCode),
          overall,
        ),
        disclaimer: fixtures.fitnessMap.disclaimer,
      };

      // 레이더는 요인마다 그 요인을 잰 항목의 백분위. 안 잰 요인은 null 이다
      const radar = [...new Set((catalogue?.items ?? []).map((i) => i.factor))].map((factor) => ({
        factor,
        percentile: items.find((i) => factorOf(i.itemCode) === factor)?.percentile ?? null,
      }));
      if (newest) {
        db.latest[profileId] = {
          ...result,
          heightCm: body.heightCm ?? null,
          weightKg: body.weightKg ?? null,
          radar: radar as Concrete<LatestFitnessTest>["radar"],
          coachDirection: sorted[0].percentile > 75 ? "STRENGTHEN" : "GROWTH",
        };
      }
      // 다시 재기는 덮어쓰기가 아니라 추가다(규칙 11). 최근 회차가 먼저
      db.tests[profileId] = [
        {
          fitnessTestId: result.fitnessTestId,
          testedOn: body.testedOn,
          overallPercentile: overall,
          heightCm: body.heightCm ?? null,
          weightKg: body.weightKg ?? null,
        },
        ...(db.tests[profileId] ?? []),
      ].sort((a, b) => b.testedOn.localeCompare(a.testedOn));

      const member = db.fitnessMap.members.find((m) => m.profileId === profileId);
      if (member && newest) {
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
      // 새로고침해도 방금 잰 것이 남아야 한다
      saveExtra("latest", "tests", "body");
      saveFamily();

      return HttpResponse.json(result, { status: 201 });
    },
  ),

  http.get(`${BASE}/families/:familyId/fitness-map`, () => HttpResponse.json(db.fitnessMap)),
];

/* ─── 코치 — 승인 게이트 ───────────────────────────────────── */

/* ─── 미션 · 한 칸 끝 · 보호자 확인 ────────────────────────── */

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
        doneSessions: [],
      })),
      // 칸의 끝냄은 사람마다 따로 든다 — 보낸 쪽이 칸에 적어 온 끝냄은 믿지 않는다
      ...(body.sessions?.length
        ? {
            sessions: body.sessions.map((s) => {
              const { completed: _c, verifiedBy: _v, ...rest } = s as Record<string, unknown>;
              // 서버처럼 칸의 영상에 공단 mp4 주소를 채운다 — 보낸 쪽은 아이디 · 구간만 싣는다
              const clip = rest.clip as { videoId?: string | null } | null | undefined;
              return clip ? { ...rest, clip: withMedia(clip) } : rest;
            }),
          }
        : {}),
    } as MissionRow;
    db.missions.push(mission);
    saveMissions();
    return HttpResponse.json(mission, { status: 201 });
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
      const sessions = sessionsOfRow(mission);
      const session = sessions.find((s) => s.position === Number(params.position));
      if (!session) return fail(404, "SESSION_NOT_FOUND", "그 칸이 없습니다");
      const me = participantOf(mission, body.profileId);
      if (!me) return fail(403, "NOT_A_PARTICIPANT", "이 운동을 하는 사람이 아닙니다");
      // 잡힌 시간의 절반도 안 했으면 끝낸 것으로 치지 않는다
      const planned = (session.minutes ?? 1) * 60;
      // 동의를 거두면 측정뿐 아니라 활동 저장도 막힌다(규칙 4)
      const person = db.profiles.profiles.find((p) => p.profileId === body.profileId);
      if (person && !person.consentGiven) {
        return fail(422, "CONSENT_REQUIRED", "보호자 동의가 필요합니다");
      }
      if ((body.activeSeconds ?? 0) < planned * 0.5) {
        return fail(422, "TOO_SHORT", "잡힌 시간의 절반도 하지 않았습니다");
      }

      // 경험치는 레벨이 세는 것과 같은 셈으로 — 끝내기 전과 뒤의 차이. 두 번 눌러도 두 번 쌓이지 않는다
      const before = progressOf(body.profileId).xp;
      // 끝낸 사람이 이 칸을 끝낸다. 아이가 끝냈으면 같이 하기로 한 보호자도 — 아이 폰 하나로 같이 한다.
      // 보호자가 끝낸 칸은 그 보호자 것뿐이다(다른 보호자 · 아이에게 번지지 않는다).
      // 형제는 저마다 한다: 한 아이가 끝낸 칸이 다른 아이 것이 되지 않는다
      const roleOf = (id: string | undefined) =>
        db.profiles.profiles.find((p) => p.profileId === id)?.role;
      const withGuardians = roleOf(me.profileId) === "CHILD";
      const total = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0) || 1;
      for (const p of (mission.participants ?? []) as ParticipantRow[]) {
        if (p !== me && !(withGuardians && roleOf(p.profileId) === "PARENT")) continue;
        p.doneSessions = [...new Set([...(p.doneSessions ?? []), session.position])];
        // 처음 끝낸 날 — 같은 칸을 다음 날 또 끝내도 옮기지 않는다
        p.doneOn = { [session.position]: toDateString(new Date()), ...(p.doneOn ?? {}) };
        const done = sessions.filter((s) => p.doneSessions.includes(s.position));
        p.progress = done.reduce((sum, s) => sum + (s.minutes ?? 0), 0) / total;
        p.verifiedBy = "TIMER";
        p.completed = done.length === sessions.length;
      }
      saveMissions();

      return HttpResponse.json({
        position: session.position,
        verifiedBy: "TIMER",
        missionProgress: me.progress,
        missionCompleted: me.completed,
        xpGained: progressOf(body.profileId).xp - before,
      });
    },
  ),

  /** 직접 적은 기록을 보호자가 확인한다 — 확인해야 완료가 된다(규칙 2) */
  http.post<PathParams>(
    `${BASE}/missions/:missionId/participants/:profileId/confirm`,
    ({ params }) => {
      const me = acting();
      if (me?.role !== "PARENT") return fail(403, "NOT_A_PARENT", "보호자가 아닙니다");
      const mission = db.missions.find((m) => m.missionId === String(params.missionId));
      if (!mission) return fail(404, "MISSION_NOT_FOUND", "미션이 없습니다");
      const who = participantOf(mission, String(params.profileId));
      if (!who) return fail(404, "PARTICIPANT_NOT_FOUND", "참여자가 아닙니다");
      // 확인할 것이 없으면(타이머 · 영상으로 이미 확인됐거나 벌써 확인했다) 바꾸지 않는다 —
      // 타이머로 확인된 것을 「직접 입력함」 으로 고쳐 적으면 서버가 아는 값이 사람이 적은 값이 된다(규칙 2)
      if (!who.needsGuardianCheck) {
        return HttpResponse.json({
          missionId: mission.missionId,
          profileId: who.profileId,
          completed: Boolean(who.completed),
          verifiedBy: who.verifiedBy ?? null,
        });
      }
      if ((who.progress ?? 0) < 1) {
        return fail(422, "TARGET_NOT_REACHED", "목표에 닿지 않았습니다");
      }
      who.completed = true;
      who.needsGuardianCheck = false;
      who.verifiedBy = "SELF_REPORT";
      saveMissions();
      return HttpResponse.json({
        missionId: mission.missionId,
        profileId: who.profileId,
        completed: true,
        verifiedBy: "SELF_REPORT",
        confirmedBy: db.actingProfileId,
        verifiedAt: new Date().toISOString(),
      });
    },
  ),
];

export const handlers = [
  ...authGate,
  ...identity,
  ...invites,
  ...fitness,
  ...coaching,
  ...missions,
  ...history,
  ...league,
  ...progress,
  ...clips,
  ...notifications,
];
