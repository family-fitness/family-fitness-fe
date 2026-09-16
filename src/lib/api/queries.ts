"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, query } from "./client";
import type {
  AgeGroup,
  AuthResponse,
  Cheer,
  CheerLogList,
  CoachApproveResult,
  CoachChatResult,
  CoachRun,
  FitnessItems,
  FitnessMap,
  FitnessTestResult,
  InviteCode,
  LatestFitnessTest,
  MeResponse,
  Mission,
  NextStep,
  MissionList,
  PredictionResult,
  ProfileSummary,
  Role,
  SupportMode,
  Uuid,
  VideoList,
  WeeklyReport,
} from "./types";

/**
 * 쿼리 키를 한 곳에서 만든다.
 * 무효화할 때 문자열을 손으로 적으면 오타가 조용히 지나간다.
 */
export const qk = {
  me: () => ["me"] as const,
  family: {
    profiles: (familyId: Uuid) => ["family", familyId, "profiles"] as const,
    fitnessMap: (familyId: Uuid) => ["family", familyId, "fitness-map"] as const,
    missions: (familyId: Uuid, scope?: string, status?: string) =>
      ["family", familyId, "missions", scope ?? "ALL", status ?? "ALL"] as const,
    report: (familyId: Uuid, weekStart?: string) =>
      ["family", familyId, "report", weekStart ?? "current"] as const,
    cheers: (familyId: Uuid, toProfileId?: Uuid) =>
      ["family", familyId, "cheers", toProfileId ?? "all"] as const,
  },
  profile: {
    latestTest: (profileId: Uuid) => ["profile", profileId, "fitness-tests", "latest"] as const,
  },
  fitness: {
    items: (ageGroup: AgeGroup | undefined) => ["fitness", "items", ageGroup ?? "all"] as const,
  },
  coach: {
    run: (runId: Uuid) => ["coach", "runs", runId] as const,
  },
  videos: (list: string, profileId?: Uuid, ageGroup?: AgeGroup) =>
    ["videos", list, profileId ?? "-", ageGroup ?? "-"] as const,
};

/* ─── 인증 · 계정 ──────────────────────────────────────────── */

/**
 * 앱 진입 시 한 번. `nextStep` 으로 어디로 보낼지 정한다.
 * CREATE_FAMILY(프로필 0개) · CLAIM(초대코드 있음) · HOME.
 */
export function useMe() {
  return useQuery({
    queryKey: qk.me(),
    queryFn: () => api.get<MeResponse>("/me"),
    staleTime: 60_000,
  });
}

/** 로컬 전용. 구글 없이 시드 계정으로 들어간다 */
export function useDevLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerUserId: string) =>
      api.post<AuthResponse>("/auth/dev-login", { providerUserId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

export function useGoogleLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { authorizationCode: string; redirectUri: string; claimCode?: string }) =>
      api.post<AuthResponse>("/auth/google", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

/* ─── 가족 · 프로필 ────────────────────────────────────────── */

export function useFamilyProfiles(familyId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.family.profiles(familyId ?? ""),
    queryFn: () =>
      api.get<{ familyId: string; familyName: string; profiles: ProfileSummary[] }>(
        `/families/${familyId}/profiles`,
      ),
    enabled: Boolean(familyId),
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      familyName: string;
      owner: { name: string; birthDate: string; sex: "M" | "F" };
    }) => api.post("/families", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

export function useCreateProfile(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      birthDate: string;
      sex: "M" | "F";
      role: "PARENT" | "CHILD";
      // 만 14세 미만은 이게 없으면 422 CONSENT_REQUIRED. 서버가 자동으로 찍지 않는다
      guardianConsent?: { personalData: boolean; healthData: boolean };
    }) => api.post<ProfileSummary>(`/families/${familyId}/profiles`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.family.profiles(familyId) });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
    },
  });
}

/** 가족 단위가 아니라 프로필 단위 코드. 계정이 안 붙은 프로필에만 발급된다 */
export function useOpenInvite() {
  return useMutation({
    mutationFn: (profileId: Uuid) => api.post<InviteCode>(`/profiles/${profileId}/invite`),
  });
}

/** 다음에 갈 곳은 서버가 정한다 — 부모면 SUPPORT_MODE, 자녀면 HOME */
export function useClaimProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimCode: string) =>
      api.post<{ profileId: Uuid; familyId: Uuid; role: Role; nextStep: NextStep }>(
        "/profiles/claim",
        { claimCode },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

export function useUpdateSupportMode(profileId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supportMode: SupportMode) =>
      api.patch<ProfileSummary>(`/profiles/${profileId}/support-mode`, { supportMode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.family.profiles(familyId) });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

/** 철회하면 그 순간부터 측정 · 예측이 422 가 된다. 과거 기록은 지우지 않는다 */
export function useUpdateConsent(profileId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { personalData: boolean; healthData: boolean }) =>
      api.patch<{ consentGiven: boolean; measurable: boolean }>(
        `/profiles/${profileId}/consent`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.family.profiles(familyId) });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
    },
  });
}

/* ─── 측정 ─────────────────────────────────────────────────── */

/** 연령대가 폼 자체를 바꾼다. 프론트가 항목을 하드코딩하지 않는다 */
export function useFitnessItems(ageGroup: AgeGroup | undefined) {
  return useQuery({
    queryKey: qk.fitness.items(ageGroup),
    queryFn: () => api.get<FitnessItems>(`/fitness/items${query({ ageGroup })}`),
    enabled: Boolean(ageGroup),
    staleTime: Infinity,
  });
}

/** 이력이 없어도 404 가 아니다. fitnessTestId 가 null 로 온다 */
export function useLatestFitnessTest(profileId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.profile.latestTest(profileId ?? ""),
    queryFn: () => api.get<LatestFitnessTest>(`/profiles/${profileId}/fitness-tests/latest`),
    enabled: Boolean(profileId),
  });
}

export function useCreateFitnessTest(profileId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      testedOn: string;
      source: "SELF_INPUT" | "CENTER_SHEET";
      heightCm?: number;
      weightKg?: number;
      items: { itemCode: string; value: number }[];
    }) => api.post<FitnessTestResult>(`/profiles/${profileId}/fitness-tests`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile.latestTest(profileId) });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
    },
  });
}

/** 홈 화면 한 번의 조회. 구성원 사이 순위 · 비교는 오지 않는다 */
export function useFitnessMap(familyId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.family.fitnessMap(familyId ?? ""),
    queryFn: () => api.get<FitnessMap>(`/families/${familyId}/fitness-map`),
    enabled: Boolean(familyId),
  });
}

/** AI 가 MAINTAIN 시나리오 하나만 낸다. 횡단면 자료라 개인의 변화가 아니다 */
export function useCreatePrediction(profileId: Uuid) {
  return useMutation({
    mutationFn: (body: { horizonYears?: number; itemCode?: string } = {}) =>
      api.post<PredictionResult>(`/profiles/${profileId}/predictions`, body),
  });
}

/* ─── 코치 ─────────────────────────────────────────────────── */

/** 비동기다. 202 로 접수만 되고 status 가 RUNNING 으로 시작한다 */
export function useStartCoachRun(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { daysPerWeek?: number; minutesPerSession?: number } = {}) =>
      api.post<{ coachRunId: string; status: string; pollAfterMs: number }>(
        `/families/${familyId}/coach/runs`,
        body,
      ),
    onSuccess: (run) => qc.invalidateQueries({ queryKey: qk.coach.run(run.coachRunId) }),
  });
}

/** RUNNING 인 동안 폴링한다. 서버가 pollAfterMs 를 준다 */
export function useCoachRun(runId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.coach.run(runId ?? ""),
    queryFn: () => api.get<CoachRun>(`/coach/runs/${runId}`),
    enabled: Boolean(runId),
    refetchInterval: (q) => (q.state.data?.status === "RUNNING" ? 1500 : false),
  });
}

/** ★ 미션이 만들어지는 유일한 지점. 승인을 건너뛰는 경로가 없다 */
export function useApproveCoachRun(runId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CoachApproveResult>(`/coach/runs/${runId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.coach.run(runId) });
      // 승인으로 미션이 생성됐다
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
    },
  });
}

/** 거절해도 미션은 0건 유지. 사유가 다음 주 편성에 참고로 들어간다 */
export function useRejectCoachRun(runId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => api.post<CoachRun>(`/coach/runs/${runId}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.coach.run(runId) }),
  });
}

export function useAskCoach(profileId: Uuid) {
  return useMutation({
    mutationFn: (body: { question: string; conversationId?: string }) =>
      api.post<CoachChatResult>("/coach/chat", { profileId, ...body }),
  });
}

/* ─── 미션 · 활동 ──────────────────────────────────────────── */

export function useMissions(
  familyId: Uuid | undefined,
  options: { scope?: "ALL" | "MINE" | "FAMILY"; status?: "ACTIVE" | "DONE" | "EXPIRED" } = {},
) {
  return useQuery({
    queryKey: qk.family.missions(familyId ?? "", options.scope, options.status),
    queryFn: () => api.get<MissionList>(`/families/${familyId}/missions${query({ ...options })}`),
    enabled: Boolean(familyId),
  });
}

export function useCreateMission(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      startDate: string;
      endDate: string;
      targetMetric: "VIDEO_DONE" | "TIMER_MINUTES" | "STEPS";
      targetValue: number;
      videoId?: string;
      participantProfileIds: string[];
    }) => api.post<Mission>(`/families/${familyId}/missions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] }),
  });
}

/** 자기 신고다. 목표를 넘겨도 보호자 확인 전에는 완료가 아니다 */
export function useRecordSteps(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { profileId: string; activityDate: string; steps: number }) =>
      api.post<{ missionProgress: number; missionCompleted: boolean; needsGuardianCheck: boolean }>(
        `/missions/${missionId}/activity/steps`,
        body,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] }),
  });
}

/** 서버가 진짜로 아는 값이라 자동 완료 판정에 쓰인다 */
export function useRecordTimer(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      profileId: string;
      startedAt: string;
      endedAt: string;
      activeMinutes: number;
    }) =>
      api.post<{ totalActiveMinutes: number; missionProgress: number; missionCompleted: boolean }>(
        `/missions/${missionId}/activity/timer`,
        body,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] }),
  });
}

/** STEPS 미션의 마지막 관문. 보호자만 누를 수 있다 */
export function useConfirmParticipant(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) =>
      api.post(`/missions/${missionId}/participants/${profileId}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] }),
  });
}

/* ─── 영상 ─────────────────────────────────────────────────── */

export function useVideos(options: {
  list?: "ALL" | "FAVORITES" | "RECENT";
  profileId?: Uuid;
  ageGroup?: AgeGroup;
  factor?: string;
}) {
  const list = options.list ?? "ALL";
  return useQuery({
    queryKey: qk.videos(list, options.profileId, options.ageGroup),
    queryFn: () => api.get<VideoList>(`/videos${query({ ...options, list, size: 20 })}`),
    // FAVORITES · RECENT 는 profileId 가 없으면 400 이다
    enabled: list === "ALL" || Boolean(options.profileId),
  });
}

export function useToggleFavorite(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ videoId, favorited }: { videoId: string; favorited: boolean }) =>
      api.post(`/videos/${videoId}/favorite`, { profileId, favorited }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

/**
 * 최대 진행률만 남는다. 처음으로 0.9 를 넘으면 영상 길이만큼 활동시간이 1회 적립된다.
 * 두 번 적립되지 않는다.
 */
export function useRecordVideoProgress(videoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      profileId: string;
      progress: number;
      watchedSec: number;
      missionId?: string;
    }) =>
      api.post<{ maxProgress: number; completed: boolean; creditedMinutes: number }>(
        `/videos/${videoId}/progress`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["family"] });
    },
  });
}

/* ─── 응원 · 리포트 ────────────────────────────────────────── */

/** 부모→자녀뿐 아니라 자녀→부모도 된다. 대칭이어야 감시가 아니라 응원이 된다 */
export function useSendCheer(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      fromProfileId: string;
      toProfileId: string;
      message?: string;
      missionId?: string;
    }) => api.post<Cheer>(`/families/${familyId}/cheers`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.family.report(familyId) });
      qc.invalidateQueries({ queryKey: ["family", familyId, "cheers"] });
    },
  });
}

/**
 * 받은 칭찬.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useCheers(familyId: Uuid | undefined, toProfileId?: Uuid) {
  return useQuery({
    queryKey: qk.family.cheers(familyId ?? "", toProfileId),
    queryFn: () => api.get<CheerLogList>(`/families/${familyId}/cheers${query({ toProfileId })}`),
    enabled: Boolean(familyId),
  });
}

export function useWeeklyReport(familyId: Uuid | undefined, weekStart?: string) {
  return useQuery({
    queryKey: qk.family.report(familyId ?? "", weekStart),
    queryFn: () =>
      api.get<WeeklyReport>(`/families/${familyId}/report/weekly${query({ weekStart })}`),
    enabled: Boolean(familyId),
  });
}
