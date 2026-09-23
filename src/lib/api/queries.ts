"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, query } from "./client";
import type {
  AgeGroup,
  AuthResponse,
  CalendarView,
  Cheer,
  CheerLogList,
  CoachApproveResult,
  TargetMetric,
  CoachRun,
  FitnessItems,
  FitnessMap,
  FitnessTestHistory,
  FitnessTestResult,
  InviteCode,
  InvitePeek,
  LatestWithBody,
  MeResponse,
  NextStep,
  MissionList,
  ProgressView,
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
    /** 앞 세 칸으로 무효화한다 — 한 일이 생기면 그 가족의 달력은 다 다시 받는다 */
    calendar: (familyId: Uuid, profileId?: Uuid, from?: string, to?: string) =>
      ["family", familyId, "calendar", profileId ?? "-", from ?? "-", to ?? "-"] as const,
  },
  profile: {
    latestTest: (profileId: Uuid) => ["profile", profileId, "fitness-tests", "latest"] as const,
    tests: (profileId: Uuid) => ["profile", profileId, "fitness-tests", "list"] as const,
    progress: (profileId: Uuid) => ["profile", profileId, "progress"] as const,
  },
  fitness: {
    items: (ageGroup: AgeGroup | undefined) => ["fitness", "items", ageGroup ?? "all"] as const,
  },
  coach: {
    run: (runId: Uuid) => ["coach", "runs", runId] as const,
    latest: (familyId: Uuid) => ["coach", "runs", "latest", familyId] as const,
  },
  videos: (list: string, profileId?: Uuid, ageGroup?: AgeGroup) =>
    ["videos", list, profileId ?? "-", ageGroup ?? "-"] as const,
};

/**
 * 경험치가 바뀌었을 수 있다. 누구 것인지 몰라도 된다 — 레벨 조회는 가볍다.
 * 운동을 끝낸 바로 그 화면에서 레벨 막대가 차올라야 해낸 게 보인다.
 */
function refreshProgress(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({
    predicate: (q) => q.queryKey[0] === "profile" && q.queryKey[2] === "progress",
  });
}

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

/*
  ▲ 아래 쿼리 여럿은 인자가 없으면 `enabled: false` 로 꺼진다.
  **꺼진 쿼리의 `isPending` 은 영영 true 다.** 화면이 그걸로 뼈대를 띄우면
  영영 뼈대만 보인다. 화면에서는 `isLoading`(꺼져 있으면 false) 을 본다.
*/

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

/**
 * 코드를 넣기 전에 어느 자리인지 본다.
 *
 * 여섯 자리가 다 채워져야 묻는다. 한 글자마다 물으면 서버가 코드를 쓸어 보는
 * 시도를 받아 주는 꼴이 된다.
 * ▲ 요청: `GET /invites/{claimCode}`. 없으면 화면은 지금처럼 코드만 받는다.
 */
export function useInvitePeek(code: string) {
  const ready = code.length === 6;
  return useQuery({
    queryKey: ["invites", code],
    queryFn: () => api.get<InvitePeek>(`/invites/${code}`),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
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
    queryFn: () => api.get<LatestWithBody>(`/profiles/${profileId}/fitness-tests/latest`),
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
      // 최근 회차와 이력을 같이. 다시 잰 값이 점수 흐름에 바로 한 점 더해져야 한다
      qc.invalidateQueries({ queryKey: ["profile", profileId, "fitness-tests"] });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
      refreshProgress(qc);
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
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: qk.coach.run(run.coachRunId) });
      // 기기를 바꿔 들어온 화면은 "이번 주 것" 을 서버에 묻는다. 그 답도 바뀌었다
      qc.invalidateQueries({ queryKey: qk.coach.latest(familyId) });
    },
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

/**
 * 이 가족의 가장 최근 코치 회차.
 *
 * 실행한 `runId` 를 기기에 들고 있어서, 브라우저를 바꾸거나 저장소를 비우면
 * **이번 주 제안을 다시 찾지 못하고** 화면이 "제안을 만들어 볼까요" 로 돌아갔다.
 * 승인 기다리는 제안이 있는데도 없는 것처럼 보이는 게 이 서비스에서 가장
 * 나쁜 상태다 — 승인 게이트가 통째로 사라진다.
 *
 * ▲ 요청: `GET /families/{familyId}/coach/runs/latest`.
 * 아직 없으면 404 가 오고, 그때는 기기에 든 값만으로 지금처럼 돈다.
 */
export function useLatestCoachRun(familyId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.coach.latest(familyId ?? ""),
    queryFn: () => api.get<CoachRun>(`/families/${familyId}/coach/runs/latest`),
    enabled: Boolean(familyId),
    retry: false,
  });
}

/** ★ 미션이 만들어지는 유일한 지점. 승인을 건너뛰는 경로가 없다 */
export function useApproveCoachRun(runId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CoachApproveResult>(`/coach/runs/${runId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.coach.run(runId) });
      qc.invalidateQueries({ queryKey: qk.coach.latest(familyId) });
      // 승인으로 미션이 생성됐다
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: qk.family.report(familyId) });
    },
  });
}

/** 거절해도 미션은 0건 유지. 사유가 다음 주 편성에 참고로 들어간다 */
export function useRejectCoachRun(runId: Uuid, familyId?: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => api.post<CoachRun>(`/coach/runs/${runId}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.coach.run(runId) });
      if (familyId) qc.invalidateQueries({ queryKey: qk.coach.latest(familyId) });
    },
  });
}

/** 대화 중에 나온 제안을 그대로 미션으로. 보호자만 할 수 있다 */
export function useCreateMission(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      startDate: string;
      endDate: string;
      targetMetric: TargetMetric;
      targetValue: number;
      videoId?: string | null;
      participantProfileIds: Uuid[];
    }) => api.post<{ missionId: Uuid }>(`/families/${familyId}/missions`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "fitness-map"] });
    },
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

/** 자기 신고다. 목표를 넘겨도 보호자 확인 전에는 완료가 아니다 */
export function useRecordSteps(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { profileId: string; activityDate: string; steps: number }) =>
      api.post<{ missionProgress: number; missionCompleted: boolean; needsGuardianCheck: boolean }>(
        `/missions/${missionId}/activity/steps`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      // 이번 주 기록의 분·완료 수가 이 값에서 나온다
      qc.invalidateQueries({ queryKey: qk.family.report(familyId) });
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      refreshProgress(qc);
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: qk.family.report(familyId) });
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      refreshProgress(qc);
    },
  });
}

/** STEPS 미션의 마지막 관문. 보호자만 누를 수 있다 */
export function useConfirmParticipant(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) =>
      api.post(`/missions/${missionId}/participants/${profileId}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: qk.family.report(familyId) });
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      refreshProgress(qc);
    },
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
      refreshProgress(qc);
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
      // 붙인 스티커는 그날 칸에 남는다
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      refreshProgress(qc);
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

/**
 * 날짜별 기록. 캘린더와 주간 막대가 같이 쓴다.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useCalendar(
  familyId: Uuid | undefined,
  profileId: Uuid | undefined,
  range: { from: string; to: string },
) {
  return useQuery({
    queryKey: qk.family.calendar(familyId ?? "", profileId, range.from, range.to),
    queryFn: () =>
      api.get<CalendarView>(
        `/families/${familyId}/calendar${query({ profileId, from: range.from, to: range.to })}`,
      ),
    enabled: Boolean(familyId && profileId),
  });
}

/**
 * 측정 이력. 점수 흐름과 키 · 몸무게가 자란 모습을 그린다.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useFitnessTests(profileId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.profile.tests(profileId ?? ""),
    queryFn: () =>
      api.get<FitnessTestHistory>(`/profiles/${profileId}/fitness-tests${query({ size: 12 })}`),
    enabled: Boolean(profileId),
  });
}

/**
 * 레벨 · 경험치 · 업적 · 연속. 서버가 계산한 값을 그대로 쓴다.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useProgress(profileId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.profile.progress(profileId ?? ""),
    queryFn: () => api.get<ProgressView>(`/profiles/${profileId}/progress`),
    enabled: Boolean(profileId),
  });
}
