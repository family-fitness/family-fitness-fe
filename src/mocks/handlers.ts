/**
 * MSW 핸들러 — 백엔드가 없는 동안의 가짜 서버.
 *
 * 단순히 고정 JSON 을 돌려주지 않는다. 화면이 실제로 마주칠 **규칙**을 그대로 구현한다.
 * 그래야 백엔드가 붙었을 때 화면을 고칠 일이 줄어든다.
 *
 *   - 코치 제안은 승인 전까지 미션을 만들지 않는다
 *   - 자녀 계정은 승인할 수 없다
 *   - 측정 항목이 0개거나, 만 4세 미만이거나, 동의가 없으면 저장이 실패한다
 *   - 영상 진행률 90% 이상일 때만 서버가 완료로 판정한다
 */
import { HttpResponse, http, type PathParams } from "msw";

import type {
  ApiErrorBody,
  ClaimProfileRequest,
  CoachChatRequest,
  CoachMessage,
  CreateFitnessTestRequest,
  CreateMissionRequest,
  FitnessTest,
  InviteCode,
  Mission,
  MissionParticipant,
  MissionProgressRequest,
  Profile,
} from "@/lib/api/types";
import { FITNESS_ITEM_LIST } from "@/lib/fitness-items";

import * as seed from "./data";

const BASE = "/api/v1";

/* ─── 서버 상태 ────────────────────────────────────────────── */

/** 새로고침하면 초기 상태로 돌아간다. 시연 중 되돌리기 쉽게 하려는 의도다 */
const db = {
  profiles: structuredClone(seed.profiles),
  fitnessTests: structuredClone(seed.fitnessTests),
  fitnessMap: structuredClone(seed.fitnessMap),
  coachRun: structuredClone(seed.coachRun),
  missions: [] as Mission[],
  videos: structuredClone(seed.videos),
  coachMessages: structuredClone(seed.coachMessages),
  /** 지금 로그인해서 보고 있는 사람. 승인 권한 테스트를 위해 바꿀 수 있다 */
  currentProfileId: seed.PROFILE_IDS.mom as string,
};

export function setCurrentProfile(profileId: string) {
  db.currentProfileId = profileId;
}

function currentProfile(): Profile | undefined {
  return db.profiles.find((p) => p.id === db.currentProfileId);
}

function fail(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ code, message }, { status });
}

function uuid() {
  return crypto.randomUUID();
}

/* ─── identity ─────────────────────────────────────────────── */

const identity = [
  http.get(`${BASE}/me/profiles`, () => HttpResponse.json(db.profiles)),

  http.post(`${BASE}/families`, () => HttpResponse.json(seed.family, { status: 201 })),

  http.post(`${BASE}/families/:familyId/profiles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const birthDate = String(body.birthDate ?? "2020-01-01");
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear();

    const profile: Profile = {
      id: uuid(),
      familyId: seed.FAMILY_ID,
      userId: null,
      displayName: String(body.displayName ?? ""),
      birthDate,
      sex: body.sex === "FEMALE" ? "FEMALE" : "MALE",
      role: body.role === "PARENT" ? "PARENT" : "CHILD",
      isOwner: false,
      heightCm: (body.heightCm as number) ?? null,
      weightKg: (body.weightKg as number) ?? null,
      supportMode: body.role === "PARENT" ? "CHEER_ONLY" : null,
      // 만 4세 미만은 국민체력100 규준 자체가 없다
      measurable: age >= 4,
      ageGroup: age < 4 ? null : age <= 6 ? "TODDLER" : age < 19 ? "YOUTH" : "ADULT",
      age,
      consentPersonalAt: body.guardianConsent ? new Date().toISOString() : null,
      consentHealthAt: body.guardianConsent ? new Date().toISOString() : null,
    };
    db.profiles.push(profile);
    db.fitnessMap.members.push({
      profile,
      headline: null,
      overallPercentile: null,
      overallGrade: null,
      weakestItem: null,
      strongestItem: null,
      lastMeasuredOn: null,
    });
    return HttpResponse.json(profile, { status: 201 });
  }),

  http.post<PathParams>(`${BASE}/profiles/:profileId/invite`, ({ params }) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const invite: InviteCode = {
      profileId: String(params.profileId),
      code,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    };
    return HttpResponse.json(invite, { status: 201 });
  }),

  http.post(`${BASE}/profiles/claim`, async ({ request }) => {
    const { code } = (await request.json()) as ClaimProfileRequest;
    if (!/^\d{6}$/.test(code)) {
      return fail(400, "INVALID_CLAIM_CODE", "초대코드가 올바르지 않아요.");
    }
    const target = db.profiles.find((p) => p.userId === null && p.role === "PARENT");
    if (!target) return fail(404, "CLAIM_CODE_NOT_FOUND", "만료되었거나 없는 코드예요.");

    target.userId = uuid();
    return HttpResponse.json(target);
  }),

  http.patch<PathParams>(
    `${BASE}/profiles/:profileId/support-mode`,
    async ({ params, request }) => {
      const body = (await request.json()) as { supportMode: Profile["supportMode"] };
      const profile = db.profiles.find((p) => p.id === params.profileId);
      if (!profile) return fail(404, "PROFILE_NOT_FOUND", "프로필을 찾을 수 없어요.");

      profile.supportMode = body.supportMode;
      return HttpResponse.json(profile);
    },
  ),

  http.delete<PathParams>(`${BASE}/profiles/:profileId/guardian-consent`, ({ params }) => {
    const profile = db.profiles.find((p) => p.id === params.profileId);
    if (!profile) return fail(404, "PROFILE_NOT_FOUND", "프로필을 찾을 수 없어요.");

    profile.consentPersonalAt = null;
    profile.consentHealthAt = null;
    return new HttpResponse(null, { status: 204 });
  }),
];

/* ─── fitness ──────────────────────────────────────────────── */

const fitness = [
  http.get(`${BASE}/fitness/items`, ({ request }) => {
    const ageGroup = new URL(request.url).searchParams.get("ageGroup");
    const items = ageGroup
      ? FITNESS_ITEM_LIST.filter((i) => i.ageGroups.includes(ageGroup as never))
      : FITNESS_ITEM_LIST;
    return HttpResponse.json(items);
  }),

  http.get<PathParams>(`${BASE}/profiles/:profileId/fitness-tests/latest`, ({ params }) =>
    HttpResponse.json(db.fitnessTests[String(params.profileId)] ?? null),
  ),

  http.post<PathParams>(
    `${BASE}/profiles/:profileId/fitness-tests`,
    async ({ params, request }) => {
      const profileId = String(params.profileId);
      const profile = db.profiles.find((p) => p.id === profileId);
      if (!profile) return fail(404, "PROFILE_NOT_FOUND", "프로필을 찾을 수 없어요.");

      // 문서 4.1 의 서버 검증 세 갈래를 그대로 구현한다
      if (!profile.measurable) {
        return fail(422, "NOT_MEASURABLE_AGE", "만 4세부터 체력 측정 결과를 볼 수 있어요.");
      }
      if (!profile.consentHealthAt) {
        return fail(403, "GUARDIAN_CONSENT_REQUIRED", "보호자 동의가 필요해요.");
      }

      const body = (await request.json()) as CreateFitnessTestRequest;
      const measured = (body.items ?? []).filter((i) => Number.isFinite(i.value));
      if (measured.length === 0) {
        return fail(400, "NO_MEASURED_ITEM", "항목을 하나 이상 입력해 주세요.");
      }

      const items = measured.map((i) => {
        // 실제로는 국민체력100 규준표와 대조한다. 목에서는 그럴듯한 값을 만든다
        const percentile = Math.max(1, Math.min(99, Math.round(20 + (i.value % 70))));
        return {
          item: i.item,
          value: i.value,
          percentile,
          grade: (percentile >= 80
            ? 1
            : percentile >= 60
              ? 2
              : percentile >= 40
                ? 3
                : percentile >= 20
                  ? 4
                  : 5) as FitnessTest["items"][number]["grade"],
        };
      });
      const overall = Math.round(items.reduce((s, i) => s + (i.percentile ?? 0), 0) / items.length);

      const test: FitnessTest = {
        id: uuid(),
        profileId,
        measuredOn: body.measuredOn,
        source: body.source,
        ageAtTest: profile.age,
        items,
        overallPercentile: overall,
        overallGrade: (overall >= 80 ? 1 : overall >= 60 ? 2 : overall >= 40 ? 3 : 4) as
          1 | 2 | 3 | 4,
      };
      db.fitnessTests[profileId] = test;

      const weakest = [...items].sort((a, b) => (a.percentile ?? 0) - (b.percentile ?? 0))[0];
      const strongest = [...items].sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0))[0];
      const member = db.fitnessMap.members.find((m) => m.profile.id === profileId);
      if (member) {
        member.headline = `또래 중 상위 ${100 - overall}%`;
        member.overallPercentile = overall;
        member.overallGrade = test.overallGrade;
        member.weakestItem = weakest?.item ?? null;
        member.strongestItem = strongest?.item ?? null;
        member.lastMeasuredOn = body.measuredOn;
      }

      return HttpResponse.json(test, { status: 201 });
    },
  ),

  http.get(`${BASE}/families/:familyId/fitness-map`, () => HttpResponse.json(db.fitnessMap)),

  http.post(`${BASE}/profiles/:profileId/predictions`, () =>
    HttpResponse.json(seed.prediction, { status: 201 }),
  ),
];

/* ─── coaching — 승인 게이트 ───────────────────────────────── */

const coaching = [
  http.get(`${BASE}/families/:familyId/coach/runs/latest`, () => HttpResponse.json(db.coachRun)),

  http.get<PathParams>(`${BASE}/coach/runs/:runId`, ({ params }) =>
    params.runId === db.coachRun.id
      ? HttpResponse.json(db.coachRun)
      : fail(404, "COACH_RUN_NOT_FOUND", "코치 실행 기록을 찾을 수 없어요."),
  ),

  http.post(`${BASE}/families/:familyId/coach/runs`, () => {
    db.coachRun = structuredClone(seed.coachRun);
    return HttpResponse.json(db.coachRun, { status: 201 });
  }),

  /**
   * 승인. 여기서 처음으로 미션이 생긴다.
   * 승인 전까지 db.missions 는 0건이고, 그게 이 서비스의 핵심 주장이다.
   */
  http.post(`${BASE}/coach/runs/:runId/approve`, () => {
    const me = currentProfile();
    if (me?.role !== "PARENT") {
      return fail(403, "PARENT_ROLE_REQUIRED", "보호자만 승인할 수 있어요.");
    }
    if (db.coachRun.status !== "AWAITING_APPROVAL") {
      return fail(409, "ALREADY_DECIDED", "이미 처리된 제안이에요.");
    }

    db.coachRun.status = "APPROVED";
    db.coachRun.approvedAt = new Date().toISOString();
    db.coachRun.approvedByProfileId = me.id;

    for (const item of db.coachRun.proposalItems) {
      db.missions.push({
        id: uuid(),
        familyId: seed.FAMILY_ID,
        origin: "COACH",
        title: item.title,
        description: item.description,
        video: db.videos.find((v) => v.id === item.videoId) ?? null,
        targetItem: item.targetItem,
        targetMinutes: 5,
        dueOn: item.scheduledFor,
        participants: item.targetProfileIds.map<MissionParticipant>((id) => ({
          profileId: id,
          displayName: db.profiles.find((p) => p.id === id)?.displayName ?? "",
          status: "PENDING",
          progressPercent: 0,
          verifiedBy: null,
          completedAt: null,
        })),
        createdAt: new Date().toISOString(),
      });
    }

    return HttpResponse.json(db.coachRun);
  }),

  http.post(`${BASE}/coach/runs/:runId/reject`, async ({ request }) => {
    const me = currentProfile();
    if (me?.role !== "PARENT") {
      return fail(403, "PARENT_ROLE_REQUIRED", "보호자만 처리할 수 있어요.");
    }
    if (db.coachRun.status !== "AWAITING_APPROVAL") {
      return fail(409, "ALREADY_DECIDED", "이미 처리된 제안이에요.");
    }

    const { reason } = (await request.json()) as { reason: string };
    db.coachRun.status = "REJECTED";
    db.coachRun.rejectedReason = reason;
    // 거절해도 미션은 여전히 0건이다
    return HttpResponse.json(db.coachRun);
  }),

  http.get(`${BASE}/coach/chat`, () => HttpResponse.json(db.coachMessages)),

  http.post(`${BASE}/coach/chat`, async ({ request }) => {
    const body = (await request.json()) as CoachChatRequest;

    db.coachMessages.push({
      id: uuid(),
      role: "USER",
      content: body.message,
      citations: [],
      createdAt: new Date().toISOString(),
    });

    // RAG 검색과 생성에 걸리는 시간. 스켈레톤이 실제로 보이게 하려고 넣었다
    await new Promise((r) => setTimeout(r, 900));

    const answer: CoachMessage = {
      id: uuid(),
      role: "ASSISTANT",
      content: seed.coachMessages[1].content,
      // 근거 없는 ASSISTANT 답변은 버그다. 목에서도 항상 채운다
      citations: seed.coachMessages[1].citations,
      createdAt: new Date().toISOString(),
    };
    db.coachMessages.push(answer);
    return HttpResponse.json(answer, { status: 201 });
  }),
];

/* ─── missions & activity ──────────────────────────────────── */

const missions = [
  http.get(`${BASE}/families/:familyId/missions`, () => HttpResponse.json(db.missions)),

  http.get<PathParams>(`${BASE}/missions/:missionId`, ({ params }) => {
    const mission = db.missions.find((m) => m.id === params.missionId);
    return mission
      ? HttpResponse.json(mission)
      : fail(404, "MISSION_NOT_FOUND", "미션을 찾을 수 없어요.");
  }),

  http.post(`${BASE}/families/:familyId/missions`, async ({ request }) => {
    const body = (await request.json()) as CreateMissionRequest;
    const mission: Mission = {
      id: uuid(),
      familyId: seed.FAMILY_ID,
      origin: "PARENT",
      title: body.title,
      description: body.description ?? null,
      video: db.videos.find((v) => v.id === body.videoId) ?? null,
      targetItem: body.targetItem ?? null,
      targetMinutes: body.targetMinutes ?? null,
      dueOn: body.dueOn ?? null,
      participants: body.participantProfileIds.map<MissionParticipant>((id) => ({
        profileId: id,
        displayName: db.profiles.find((p) => p.id === id)?.displayName ?? "",
        status: "PENDING",
        progressPercent: 0,
        verifiedBy: null,
        completedAt: null,
      })),
      createdAt: new Date().toISOString(),
    };
    db.missions.push(mission);
    return HttpResponse.json(mission, { status: 201 });
  }),

  http.post<PathParams>(`${BASE}/missions/:missionId/progress`, async ({ params, request }) => {
    const mission = db.missions.find((m) => m.id === params.missionId);
    if (!mission) return fail(404, "MISSION_NOT_FOUND", "미션을 찾을 수 없어요.");

    const body = (await request.json()) as MissionProgressRequest;
    const participant = mission.participants.find((p) => p.profileId === body.profileId);
    if (!participant) return fail(404, "PARTICIPANT_NOT_FOUND", "참여자가 아니에요.");

    if (body.verifiedBy === "VIDEO_PROGRESS") {
      participant.progressPercent = body.progressPercent ?? 0;
      // 서버가 아는 값이다. 90% 이상이면 완료로 판정한다
      if (participant.progressPercent >= 90) {
        participant.status = "DONE";
        participant.verifiedBy = "VIDEO_PROGRESS";
        participant.completedAt = new Date().toISOString();
      } else {
        participant.status = "IN_PROGRESS";
      }
    } else if (body.verifiedBy === "TIMER") {
      participant.status = "DONE";
      participant.progressPercent = 100;
      participant.verifiedBy = "TIMER";
      participant.completedAt = new Date().toISOString();
    } else {
      // 걸음수는 자기 신고다. 서버가 완료로 올리지 않는다 — 부모 확인이 방어선
      participant.status = "IN_PROGRESS";
      participant.verifiedBy = "SELF_REPORT";
    }

    return HttpResponse.json(mission);
  }),

  http.get(`${BASE}/families/:familyId/activity`, () => HttpResponse.json(seed.activity)),
  http.post(
    `${BASE}/profiles/:profileId/activity/steps`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post(
    `${BASE}/profiles/:profileId/activity/timer`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.get(`${BASE}/families/:familyId/report`, () => HttpResponse.json(seed.weeklyReport)),
];

/* ─── videos & facilities ──────────────────────────────────── */

const videos = [
  http.get(`${BASE}/profiles/:profileId/videos/recommend`, ({ request }) => {
    const q = new URL(request.url).searchParams;
    const noise = q.get("noiseLevel");
    const space = q.get("spaceRequirement");

    const result = db.videos.filter(
      (v) => (!noise || v.noiseLevel === noise) && (!space || v.spaceRequirement === space),
    );
    return HttpResponse.json(result);
  }),

  http.get(`${BASE}/profiles/:profileId/videos/favorites`, () =>
    HttpResponse.json(db.videos.filter((v) => v.favorited)),
  ),

  http.get(`${BASE}/profiles/:profileId/videos/recent`, () =>
    HttpResponse.json(db.videos.slice(0, 2)),
  ),

  http.post(`${BASE}/profiles/:profileId/videos/favorites`, async ({ request }) => {
    const { videoId } = (await request.json()) as { videoId: string };
    const video = db.videos.find((v) => v.id === videoId);
    if (video) video.favorited = true;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete<PathParams>(`${BASE}/profiles/:profileId/videos/favorites/:videoId`, ({ params }) => {
    const video = db.videos.find((v) => v.id === params.videoId);
    if (video) video.favorited = false;
    return new HttpResponse(null, { status: 204 });
  }),

  // 공공데이터포털 프록시는 /api/v1 이 아니라 Next 의 Route Handler 다
  http.get("/api/facilities", () => HttpResponse.json(seed.facilities)),
];

export const handlers = [...identity, ...fitness, ...coaching, ...missions, ...videos];
