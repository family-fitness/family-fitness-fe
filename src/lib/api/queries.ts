"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "./client";
import type {
  ActivitySummary,
  ClaimProfileRequest,
  CoachChatRequest,
  CoachMessage,
  CoachRun,
  CreateFamilyRequest,
  CreateFitnessTestRequest,
  CreateMissionRequest,
  CreatePredictionRequest,
  CreateProfileRequest,
  ExerciseVideo,
  Facility,
  FacilityQuery,
  Family,
  FitnessItemMeta,
  FitnessMap,
  FitnessTest,
  InviteCode,
  Mission,
  MissionProgressRequest,
  Prediction,
  Profile,
  SupportMode,
  Uuid,
  VideoRecommendQuery,
  WeeklyReport,
} from "./types";

/**
 * 쿼리 키를 한 곳에서 만든다.
 * 무효화할 때 문자열을 손으로 적으면 오타가 조용히 지나간다.
 */
export const qk = {
  me: {
    profiles: () => ["me", "profiles"] as const,
  },
  family: {
    detail: (familyId: Uuid) => ["family", familyId] as const,
    fitnessMap: (familyId: Uuid) => ["family", familyId, "fitness-map"] as const,
    activity: (familyId: Uuid) => ["family", familyId, "activity"] as const,
    missions: (familyId: Uuid) => ["family", familyId, "missions"] as const,
    report: (familyId: Uuid) => ["family", familyId, "report"] as const,
  },
  profile: {
    detail: (profileId: Uuid) => ["profile", profileId] as const,
    latestTest: (profileId: Uuid) => ["profile", profileId, "fitness-tests", "latest"] as const,
    prediction: (profileId: Uuid) => ["profile", profileId, "prediction"] as const,
    videos: {
      recommend: (profileId: Uuid, query?: VideoRecommendQuery) =>
        ["profile", profileId, "videos", "recommend", query ?? {}] as const,
      favorites: (profileId: Uuid) => ["profile", profileId, "videos", "favorites"] as const,
      recent: (profileId: Uuid) => ["profile", profileId, "videos", "recent"] as const,
    },
  },
  fitness: {
    items: (ageGroup?: string) => ["fitness", "items", ageGroup ?? "all"] as const,
  },
  coach: {
    run: (runId: Uuid) => ["coach", "runs", runId] as const,
    latestRun: (familyId: Uuid) => ["coach", "runs", "latest", familyId] as const,
    chat: (profileId: Uuid) => ["coach", "chat", profileId] as const,
  },
  mission: {
    detail: (missionId: Uuid) => ["mission", missionId] as const,
  },
  facilities: (query: FacilityQuery) => ["facilities", query] as const,
};

/* ─── identity ─────────────────────────────────────────────── */

/** 내 계정에 딸린 프로필 목록. 부모 계정 하나가 온 가족 프로필을 들고 있을 수 있다 */
export function useMyProfiles() {
  return useQuery({
    queryKey: qk.me.profiles(),
    queryFn: () => api.get<Profile[]>("/me/profiles"),
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFamilyRequest) => api.post<Family>("/families", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me.profiles() }),
  });
}

export function useCreateProfile(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProfileRequest) =>
      api.post<Profile>(`/families/${familyId}/profiles`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.me.profiles() });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
    },
  });
}

/**
 * 특정 프로필로의 초대코드를 연다.
 * 가족 단위 코드가 아니라 항상 특정 프로필로의 초대다 —
 * 코드 하나를 돌리면 받는 사람이 "나 부모야" 라고 주장할 수 있기 때문이다.
 */
export function useOpenInvite() {
  return useMutation({
    mutationFn: (profileId: Uuid) => api.post<InviteCode>(`/profiles/${profileId}/invite`),
  });
}

export function useClaimProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClaimProfileRequest) => api.post<Profile>("/profiles/claim", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me.profiles() }),
  });
}

export function useUpdateSupportMode(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supportMode: SupportMode) =>
      api.patch<Profile>(`/profiles/${profileId}/support-mode`, { supportMode }),
    onSuccess: (profile) => {
      qc.invalidateQueries({ queryKey: qk.profile.detail(profileId) });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(profile.familyId) });
    },
  });
}

/** 동의 철회. 이 시점부터 측정·활동 저장이 403 이 된다 */
export function useWithdrawGuardianConsent(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>(`/profiles/${profileId}/guardian-consent`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile.detail(profileId) }),
  });
}

/* ─── fitness ──────────────────────────────────────────────── */

/** 측정 항목 목록. optionalInput 플래그로 폼을 두 구역으로 나눈다 */
export function useFitnessItems(ageGroup?: string) {
  return useQuery({
    queryKey: qk.fitness.items(ageGroup),
    queryFn: () =>
      api.get<FitnessItemMeta[]>(`/fitness/items${ageGroup ? `?ageGroup=${ageGroup}` : ""}`),
    // 항목 정의는 배포 없이는 안 바뀐다
    staleTime: Infinity,
  });
}

export function useLatestFitnessTest(profileId: Uuid) {
  return useQuery({
    queryKey: qk.profile.latestTest(profileId),
    queryFn: () => api.get<FitnessTest | null>(`/profiles/${profileId}/fitness-tests/latest`),
  });
}

export function useCreateFitnessTest(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFitnessTestRequest) =>
      api.post<FitnessTest>(`/profiles/${profileId}/fitness-tests`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile.latestTest(profileId) });
      qc.invalidateQueries({ queryKey: ["family"] });
    },
  });
}

/** 홈 화면 전체가 이 호출 하나로 온다 */
export function useFitnessMap(familyId: Uuid) {
  return useQuery({
    queryKey: qk.family.fitnessMap(familyId),
    queryFn: () => api.get<FitnessMap>(`/families/${familyId}/fitness-map`),
  });
}

export function useCreatePrediction(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePredictionRequest = {}) =>
      api.post<Prediction>(`/profiles/${profileId}/predictions`, body),
    onSuccess: (data) => qc.setQueryData(qk.profile.prediction(profileId), data),
  });
}

/* ─── coaching ─────────────────────────────────────────────── */

export function useCoachRun(runId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.coach.run(runId ?? ""),
    queryFn: () => api.get<CoachRun>(`/coach/runs/${runId}`),
    enabled: Boolean(runId),
  });
}

export function useLatestCoachRun(familyId: Uuid) {
  return useQuery({
    queryKey: qk.coach.latestRun(familyId),
    queryFn: () => api.get<CoachRun | null>(`/families/${familyId}/coach/runs/latest`),
  });
}

export function useRunCoach(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CoachRun>(`/families/${familyId}/coach/runs`),
    onSuccess: (run) => {
      qc.setQueryData(qk.coach.run(run.id), run);
      qc.invalidateQueries({ queryKey: qk.coach.latestRun(familyId) });
    },
  });
}

/**
 * 보호자 승인. **여기서 처음으로 미션이 생긴다.**
 * 승인 전 missions 는 0건이고, 자녀 계정은 PARENT_ROLE_REQUIRED 로 막힌다.
 */
export function useApproveCoachRun(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: Uuid) => api.post<CoachRun>(`/coach/runs/${runId}/approve`),
    onSuccess: (run) => {
      qc.setQueryData(qk.coach.run(run.id), run);
      qc.invalidateQueries({ queryKey: qk.coach.latestRun(familyId) });
      // 승인으로 미션이 생성됐다
      qc.invalidateQueries({ queryKey: qk.family.missions(familyId) });
    },
  });
}

/** 거절도 1급 동작이다. 사유를 남긴다 */
export function useRejectCoachRun(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, reason }: { runId: Uuid; reason: string }) =>
      api.post<CoachRun>(`/coach/runs/${runId}/reject`, { reason }),
    onSuccess: (run) => {
      qc.setQueryData(qk.coach.run(run.id), run);
      qc.invalidateQueries({ queryKey: qk.coach.latestRun(familyId) });
    },
  });
}

export function useCoachChat(profileId: Uuid) {
  return useQuery({
    queryKey: qk.coach.chat(profileId),
    queryFn: () => api.get<CoachMessage[]>(`/coach/chat?profileId=${profileId}`),
  });
}

export function useSendCoachMessage(
  profileId: Uuid,
  options?: UseMutationOptions<CoachMessage, Error, CoachChatRequest>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CoachChatRequest) => api.post<CoachMessage>("/coach/chat", body),
    ...options,
    onSuccess: (...args) => {
      qc.invalidateQueries({ queryKey: qk.coach.chat(profileId) });
      options?.onSuccess?.(...args);
    },
  });
}

/* ─── missions & activity ──────────────────────────────────── */

export function useMissions(familyId: Uuid) {
  return useQuery({
    queryKey: qk.family.missions(familyId),
    queryFn: () => api.get<Mission[]>(`/families/${familyId}/missions`),
  });
}

export function useMission(missionId: Uuid) {
  return useQuery({
    queryKey: qk.mission.detail(missionId),
    queryFn: () => api.get<Mission>(`/missions/${missionId}`),
  });
}

export function useCreateMission(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMissionRequest) =>
      api.post<Mission>(`/families/${familyId}/missions`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.family.missions(familyId) }),
  });
}

/**
 * 미션 진행 갱신.
 * 완료 판정은 서버가 한다 — 영상 진행률 90% 이상이거나, 타이머 종료거나.
 * 걸음수는 자기 신고라 서버가 완료로 올리지 않는다.
 */
export function useUpdateMissionProgress(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MissionProgressRequest) =>
      api.post<Mission>(`/missions/${missionId}/progress`, body),
    onSuccess: (mission) => {
      qc.setQueryData(qk.mission.detail(missionId), mission);
      qc.invalidateQueries({ queryKey: qk.family.missions(familyId) });
      qc.invalidateQueries({ queryKey: qk.family.activity(familyId) });
    },
  });
}

export function useFamilyActivity(familyId: Uuid) {
  return useQuery({
    queryKey: qk.family.activity(familyId),
    queryFn: () => api.get<ActivitySummary>(`/families/${familyId}/activity`),
  });
}

/** 사람이 폰 만보계를 보고 적는 값. 자동 실측이 아니다 */
export function useReportSteps(profileId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (steps: number) =>
      api.post<void>(`/profiles/${profileId}/activity/steps`, { steps }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.family.activity(familyId) }),
  });
}

export function useSubmitTimer(profileId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (minutes: number) =>
      api.post<void>(`/profiles/${profileId}/activity/timer`, { minutes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.family.activity(familyId) }),
  });
}

export function useWeeklyReport(familyId: Uuid) {
  return useQuery({
    queryKey: qk.family.report(familyId),
    queryFn: () => api.get<WeeklyReport>(`/families/${familyId}/report`),
  });
}

/* ─── videos & facilities ──────────────────────────────────── */

export function useRecommendedVideos(profileId: Uuid, query?: VideoRecommendQuery) {
  const search = new URLSearchParams(
    Object.entries(query ?? {}).filter(([, v]) => v !== undefined) as [string, string][],
  ).toString();

  return useQuery({
    queryKey: qk.profile.videos.recommend(profileId, query),
    queryFn: () =>
      api.get<ExerciseVideo[]>(
        `/profiles/${profileId}/videos/recommend${search ? `?${search}` : ""}`,
      ),
  });
}

export function useFavoriteVideos(profileId: Uuid) {
  return useQuery({
    queryKey: qk.profile.videos.favorites(profileId),
    queryFn: () => api.get<ExerciseVideo[]>(`/profiles/${profileId}/videos/favorites`),
  });
}

export function useRecentVideos(profileId: Uuid) {
  return useQuery({
    queryKey: qk.profile.videos.recent(profileId),
    queryFn: () => api.get<ExerciseVideo[]>(`/profiles/${profileId}/videos/recent`),
  });
}

export function useToggleFavorite(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ videoId, favorited }: { videoId: Uuid; favorited: boolean }) =>
      favorited
        ? api.post<void>(`/profiles/${profileId}/videos/favorites`, { videoId })
        : api.delete<void>(`/profiles/${profileId}/videos/favorites/${videoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile.videos.favorites(profileId) });
      qc.invalidateQueries({ queryKey: ["profile", profileId, "videos", "recommend"] });
    },
  });
}

/**
 * 근처 공공체육시설·강좌.
 * 공공데이터포털 API 는 CORS 를 열어주지 않으므로 Next 의 Route Handler 가 프록시한다.
 * 그래서 이 경로만 /api/v1 이 아니라 /api/facilities 다.
 */
export function useFacilities(query: FacilityQuery) {
  const search = new URLSearchParams({
    latitude: String(query.latitude),
    longitude: String(query.longitude),
    ...(query.radiusKm ? { radiusKm: String(query.radiusKm) } : {}),
  }).toString();

  return useQuery({
    queryKey: qk.facilities(query),
    queryFn: async () => {
      const res = await fetch(`/api/facilities?${search}`);
      if (!res.ok) throw new Error("근처 시설을 불러오지 못했어요");
      return res.json() as Promise<Facility[]>;
    },
  });
}
