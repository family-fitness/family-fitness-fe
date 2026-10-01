"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { nextCursorOf } from "@/lib/videos";

import { ApiError, api, path, query } from "./client";
import type { ReviewKind } from "@/lib/review-login";
import type {
  AgeGroup,
  AuthResponse,
  ReviewLoginResponse,
  Availability,
  AvailabilitySlot,
  ClipList,
  MissionSession,
  CalendarView,
  Cheer,
  CheerLogList,
  ClaimBody,
  CoachApproveResult,
  CoachRejectResult,
  TargetMetric,
  CoachRun,
  FitnessItems,
  FitnessMap,
  FitnessTestHistory,
  FitnessTestResult,
  FamilyInvite,
  GuardianConsent,
  InviteCode,
  InvitePeek,
  PendingInviteList,
  NotificationList,
  LatestWithBody,
  MeResponse,
  NextStep,
  MissionList,
  ProgressView,
  ProfileSummary,
  Role,
  SupportMode,
  Uuid,
  FamilyLeague,
  RestDays,
  FamilyCreated,
  FamilyProfiles,
} from "./types";

/**
 * 쿼리 키를 한 곳에서 만든다.
 * 무효화할 때 문자열을 손으로 적으면 오타가 조용히 지나간다.
 */
const qk = {
  me: () => ["me"] as const,
  family: {
    profiles: (familyId: Uuid) => ["family", familyId, "profiles"] as const,
    fitnessMap: (familyId: Uuid) => ["family", familyId, "fitness-map"] as const,
    missions: (familyId: Uuid, scope?: string, status?: string) =>
      ["family", familyId, "missions", scope ?? "ALL", status ?? "ALL"] as const,
    cheers: (familyId: Uuid, toProfileId?: Uuid, missionId?: Uuid) =>
      ["family", familyId, "cheers", toProfileId ?? "all", missionId ?? "all"] as const,
    /** 앞 세 칸으로 무효화한다 — 한 일이 생기면 그 가족의 달력은 다 다시 받는다 */
    calendar: (familyId: Uuid, profileId?: Uuid, from?: string, to?: string) =>
      ["family", familyId, "calendar", profileId ?? "-", from ?? "-", to ?? "-"] as const,
    league: (familyId: Uuid, month: string) => ["family", familyId, "league", month] as const,
    invites: (familyId: Uuid) => ["family", familyId, "invites"] as const,
    restDays: (familyId: Uuid, month: string) => ["family", familyId, "rest-days", month] as const,
  },
  profile: {
    latestTest: (profileId: Uuid) => ["profile", profileId, "fitness-tests", "latest"] as const,
    tests: (profileId: Uuid) => ["profile", profileId, "fitness-tests", "list"] as const,
    progress: (profileId: Uuid) => ["profile", profileId, "progress"] as const,
    availability: (profileId: Uuid) => ["profile", profileId, "availability"] as const,
  },
  notifications: (profileId: Uuid) => ["notifications", profileId] as const,
  fitness: {
    items: (ageGroup: AgeGroup | undefined) => ["fitness", "items", ageGroup ?? "all"] as const,
  },
  coach: {
    run: (runId: Uuid) => ["coach", "runs", runId] as const,
    /** 아이를 주면 그 아이 것만. 가족 id 로 무효화하면 아이마다의 것도 같이 지워진다(앞 키가 같다) */
    latest: (familyId: Uuid, profileId?: Uuid) =>
      profileId
        ? (["coach", "runs", "latest", familyId, profileId] as const)
        : (["coach", "runs", "latest", familyId] as const),
  },
  clips: (filter: Record<string, string | boolean | null | undefined>) =>
    ["clips", filter] as const,
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
 * CREATE_FAMILY(프로필 0개) · CLAIM(초대코드 있음) · SUPPORT_MODE(초대받은 부모가 참여 방식 전) · HOME.
 */
export function useMe() {
  return useQuery({
    queryKey: qk.me(),
    queryFn: () => api.get<MeResponse>("/me"),
    staleTime: 60_000,
  });
}

/**
 * 들어오자마자 받아 둔 값을 비우고, 로그인 응답에 얹혀 온 `/me` 로 채운다 — 스플래시가 한 번 더 묻지 않고,
 * 앞 계정의 `/me` 로 길을 정하지 않는다(로그아웃하고 5분 안에 다른 계정으로 들어오면 앞 계정의 단계로 갔다).
 */
function seedAccount(qc: ReturnType<typeof useQueryClient>, auth: AuthResponse) {
  qc.removeQueries();
  if (auth.nextStep && Array.isArray(auth.profiles)) {
    qc.setQueryData<MeResponse>(qk.me(), {
      userId: auth.userId,
      nextStep: auth.nextStep,
      profiles: auth.profiles,
    });
  }
}

/**
 * 로컬 전용. 구글 없이 시드 계정으로 들어간다. 초대코드를 들고 가면 서버가 가족이 없는 계정에
 * `CLAIM` 을 준다(구글 로그인과 같다)
 */
export function useDevLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { providerUserId: string; claimCode?: string }) =>
      api.post<AuthResponse>("/auth/dev-login", body),
    onSuccess: (auth) => seedAccount(qc, auth),
  });
}

export function useGoogleLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { authorizationCode: string; redirectUri: string; claimCode?: string }) =>
      api.post<AuthResponse>("/auth/google", body),
    onSuccess: (auth) => seedAccount(qc, auth),
  });
}

/**
 * 심사용 계정으로 들어간다. 토큰 없이 부르고, 본문 `{ kind }` 로 세 흐름 가운데 하나를 고른다.
 *
 *   FAMILY   서버가 부를 때마다 새 계정과 「체험 가족」(보호자 둘 · 아이 둘, 측정 기록까지)을 만든다 —
 *            심사위원끼리 서로의 기록을 건드리지 않게. 가족이 이미 있어서 바로 홈으로 간다
 *   FRESH    가족이 없는 새 계정. 가족 만들기부터 시작한다
 *   INVITED  가족이 없는 새 계정과, 서버가 꾸며 둔 체험 가족의 초대코드(`inviteCode`)
 *
 * 같은 곳에서 너무 자주 부르면 서버가 429(TOO_MANY)를 돌려준다.
 */
export function useReviewLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: ReviewKind) => api.post<ReviewLoginResponse>("/auth/review-login", { kind }),
    onSuccess: (auth) => seedAccount(qc, auth),
  });
}

/**
 * 계정 탈퇴. 성공(204)하면 화면이 이 기기에서만 로그아웃한다(`useSignOut`). 계정이 이미 없어 서버 로그아웃은 부르지 않는다.
 * 다른 구성원이 남은 오너는 409 FAMILY_NOT_EMPTY 를 받는다
 */
export function useWithdraw() {
  return useMutation({
    mutationFn: () => api.delete<void>("/me"),
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
    queryFn: () => api.get<FamilyProfiles>(path`/families/${familyId}/profiles`),
    enabled: Boolean(familyId),
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      familyName: string;
      owner: { name: string; birthDate: string; sex: "M" | "F" };
    }) => api.post<FamilyCreated>("/families", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

/**
 * 가족에 프로필을 더한다. familyId 는 부를 때 넘길 수 있다.
 * 첫 시작은 가족을 만든 바로 그 흐름에서 아이를 만든다. 그때 훅이 그려질 때 받은 familyId 는 아직 빈 값이라
 * /families//profiles 로 나갈 수 있었다
 */
export function useCreateProfile(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      familyId: target = familyId,
      ...body
    }: {
      familyId?: Uuid;
      name: string;
      birthDate: string;
      sex: "M" | "F";
      role: "PARENT" | "CHILD";
      // 만 14세 미만은 이게 없으면 422 CONSENT_REQUIRED. 서버가 자동으로 찍지 않는다
      guardianConsent?: { personalData: boolean; healthData: boolean };
    }) => api.post<ProfileSummary>(path`/families/${target}/profiles`, body),
    onSuccess: (_, { familyId: target = familyId }) => {
      // 지금 안 떠 있는 홈의 것까지 다시 받는다 — 안 그러면 홈에 옛 가족이 먼저 뜨고 새 아이 대신 첫째가 잠깐 선다
      qc.invalidateQueries({ queryKey: qk.family.profiles(target), refetchType: "all" });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(target), refetchType: "all" });
      // `/me` 는 이 계정이 관리하는 프로필이다 — 계정 없는 아이가 늘었다
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

/**
 * 오너가 구성원을 내보낸다(204). 내보낸 사람의 프로필과 기록이 지워지고, 계정이 있는 사람이면 계정은 남고 가족에서만 빠진다.
 * 오너가 아니면 403, 자기 자신이면 409 CANNOT_REMOVE_SELF, 다른 가족이면 404
 */
export function useRemoveMember(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: Uuid) =>
      api.delete<void>(path`/families/${familyId}/profiles/${profileId}`),
    onSuccess: (_, profileId) => {
      // 가족 목록, 가족 지도, 운동, 칭찬, 달력, 리그를 다시 받는다. 지금 안 떠 있는 화면의 것도
      void qc.invalidateQueries({ queryKey: ["family", familyId], refetchType: "all" });
      // `/me` 는 이 계정이 관리하는 프로필이다. 계정 없는 아이가 빠졌을 수 있다
      void qc.invalidateQueries({ queryKey: qk.me() });
      void qc.invalidateQueries({ queryKey: qk.coach.latest(familyId) });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      // 내보낸 사람의 측정, 레벨, 운동 시간은 이제 없다
      qc.removeQueries({ queryKey: ["profile", profileId] });
    },
  });
}

/** 자리 초대. 가족 단위가 아니라 프로필 단위 코드다. 계정이 안 붙은 프로필에만 발급된다 */
export function useOpenInvite() {
  return useMutation({
    mutationFn: (profileId: Uuid) => api.post<InviteCode>(path`/profiles/${profileId}/invite`),
  });
}

/**
 * 가족 초대 코드를 만든다(보호자만). 보호자로 부를지 아이로 부를지만 정하고, 이름과 생년월일은 받은 사람이 넣는다.
 * 아이로 부르면 보호자 동의가 있어야 한다(없으면 422 CONSENT_REQUIRED)
 */
export function useCreateFamilyInvite(familyId: Uuid | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { role: Role; guardianConsent?: GuardianConsent }) =>
      api.post<FamilyInvite>(path`/families/${familyId}/invites`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.family.invites(familyId ?? "") }),
  });
}

/** 아직 쓰지 않았고 기한이 남은 가족 초대(보호자만) */
export function useFamilyInvites(familyId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.family.invites(familyId ?? ""),
    queryFn: () => api.get<PendingInviteList>(path`/families/${familyId}/invites`),
    enabled: Boolean(familyId),
  });
}

/** 가족 초대를 취소한다(204). 이미 쓰였거나 없으면 404 INVITE_NOT_FOUND */
export function useCancelFamilyInvite(familyId: Uuid | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.delete<void>(path`/families/${familyId}/invites/${code}`),
    // 없다는 답(404)도 목록에서 빠져야 맞다 — 성공과 실패 모두 다시 받는다
    onSettled: () => qc.invalidateQueries({ queryKey: qk.family.invites(familyId ?? "") }),
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
    queryFn: () => api.get<InvitePeek>(path`/invites/${code}`),
    enabled: ready,
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * 초대 코드로 가족에 참여한다. 자리 초대는 코드만, 가족 초대는 이름, 생년월일, 성별을 함께 보낸다.
 * 다음에 갈 곳은 서버가 정한다 — 부모면 SUPPORT_MODE, 자녀면 HOME
 */
export function useClaimProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClaimBody) =>
      api.post<{ profileId: Uuid; familyId: Uuid; role: Role; nextStep: NextStep }>(
        "/profiles/claim",
        body,
      ),
    // 이 계정의 세상이 바뀐다(가족이 생긴다) — 받아 둔 옛 `/me` 로 다음 화면이 길을 정하지 않게 비운다.
    // 코드 미리 보기는 남긴다 — 지우면 떠나는 동안 코드 화면이 다시 물어 방금 쓴 코드를 「이미 쓴 코드」 라 했다
    onSuccess: () => qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "invites" }),
  });
}

export function useUpdateSupportMode(profileId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supportMode: SupportMode) =>
      api.patch<ProfileSummary>(path`/profiles/${profileId}/support-mode`, { supportMode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.family.profiles(familyId) });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

/** 거두면 그 순간부터 측정 · 활동 저장이 막힌다(CONSENT_REQUIRED). 지난 기록은 지우지 않는다 */
export function useUpdateConsent(profileId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { personalData: boolean; healthData: boolean }) =>
      api.patch<{ consentGiven: boolean; measurable: boolean }>(
        path`/profiles/${profileId}/consent`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.family.profiles(familyId) });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
      // `/me` 의 프로필에도 measurable · consent 가 있다
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

/* ─── 측정 ─────────────────────────────────────────────────── */

/** 연령대가 폼 자체를 바꾼다. 프론트가 항목을 하드코딩하지 않는다 */
export function useFitnessItems(ageGroup: AgeGroup | undefined) {
  return useQuery({
    queryKey: qk.fitness.items(ageGroup),
    queryFn: () => api.get<FitnessItems>(path`/fitness/items${query({ ageGroup })}`),
    enabled: Boolean(ageGroup),
    staleTime: Infinity,
  });
}

/** 이력이 없어도 404 가 아니다. fitnessTestId 가 null 로 온다 */
export function useLatestFitnessTest(profileId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.profile.latestTest(profileId ?? ""),
    queryFn: () => api.get<LatestWithBody>(path`/profiles/${profileId}/fitness-tests/latest`),
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
    }) => api.post<FitnessTestResult>(path`/profiles/${profileId}/fitness-tests`, body),
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
    queryFn: () => api.get<FitnessMap>(path`/families/${familyId}/fitness-map`),
    enabled: Boolean(familyId),
  });
}

/* ─── 코치 ─────────────────────────────────────────────────── */

/**
 * 오늘 운동을 짜 달라고 한다. 채팅이 아니라 **고른 조건**을 보낸다(9/23 회의).
 * 비동기다 — 202 로 접수만 되고 status 가 RUNNING 으로 시작한다.
 *
 * ▲ 계약의 요청은 한 주 단위(`weekStart` · `daysPerWeek` · `minutesPerSession`)다.
 * 하루 단위와 조건 칸을 요청해 두었다(`BACKEND_ASKS.md`). `minutesPerSession` 은
 * 지금 서버도 알아듣게 같이 보낸다.
 */
interface PlanRequest {
  /** 누구의 운동인지 */
  profileId: string;
  /** YYYY-MM-DD. 그날 하루 */
  date: string;
  minutes: number;
  /** 아랫집이 신경 쓰이면 뛰는 동작을 뺀다 */
  quiet: boolean;
  place: "HOME" | "OUTDOOR";
  /** 보호자가 키워 주고 싶은 역량(focus_factor). null 이면 코치가 가장 낮은 요인을 고른다 */
  focusFactor: string | null;
  /** 부모도 같이 하나. 참여 방식에서 기본값이 온다 */
  withParent: boolean;
  /**
   * 가입 때 적은 키 · 몸무게. 안 잰 아이는 이것과 나이 · 성별로 짠다(9/30 시연).
   * ▲ 요청: 지금 서버는 받지 않는다(BACKEND_API) — 받게 되면 그대로 쓴다
   */
  heightCm?: number;
  weightKg?: number;
}

export function useStartCoachRun(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlanRequest) =>
      api.post<{ coachRunId: string; status: string; pollAfterMs: number }>(
        path`/families/${familyId}/coach/runs`,
        { ...body, minutesPerSession: body.minutes },
      ),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: qk.coach.run(run.coachRunId) });
      // 기기를 바꿔 들어온 화면은 "이번 주 것" 을 서버에 묻는다. 그 답도 바뀌었다
      qc.invalidateQueries({ queryKey: qk.coach.latest(familyId) });
    },
  });
}

/**
 * RUNNING 인 동안 0.7초마다 묻는다(서버가 시작할 때 준 pollAfterMs 와 같은 값).
 * `poll` 이 false 면 묻기를 쉰다 — 단계가 한참 안 움직이면 화면이 멈춘다(서버가 RUNNING 에 멈추면 끝없이 물었다)
 */
export function useCoachRun(runId: Uuid | undefined, poll = true) {
  return useQuery({
    queryKey: qk.coach.run(runId ?? ""),
    queryFn: () => api.get<CoachRun>(path`/coach/runs/${runId}`),
    enabled: Boolean(runId),
    // 짜는 동안은 촘촘히 — 단계가 하나씩 차오르는 것이 이 화면의 전부다.
    // 막혔거나 없어진 회차(4xx)면 멈춘다 — 다시 물어도 같은 답을 0.7초마다 받았다. 늦음 · 너무 잦음(408 · 429)은 다시 묻는다
    refetchInterval: (q) => {
      const e = q.state.error;
      const settled =
        e instanceof ApiError && e.status < 500 && e.status !== 408 && e.status !== 429;
      if (!poll || q.state.data?.status !== "RUNNING" || settled) return false;
      // 못 받으면(429 · 5xx · 망) 점점 늦게 — 0.7 · 1.4 · 2.8 … 15초까지. 힘든 서버를 0.7초마다 두드리지 않는다
      return Math.min(700 * 2 ** q.state.fetchFailureCount, 15_000);
    },
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
 * 아이를 주면(`?profileId=`) 그 아이를 짠 것 가운데 가장 최근 것이다. 편성은 아이 한 명의 하루라서,
 * 가족 전체의 최근 한 건만 보면 둘째를 나중에 짜는 순간 첫째의 기다리는 제안이 가려졌다
 * (첫째 칸에 「AI 제안이 와 있어요」 가 사라지고 AI 받기 단추가 다시 떴다). 없으면 404 `COACH_RUN_NOT_FOUND`.
 */
export function useLatestCoachRun(familyId: Uuid | undefined, profileId?: Uuid) {
  return useQuery({
    queryKey: qk.coach.latest(familyId ?? "", profileId),
    queryFn: () =>
      api.get<CoachRun>(path`/families/${familyId}/coach/runs/latest${query({ profileId })}`),
    enabled: Boolean(familyId),
    retry: false,
  });
}

/** ★ 미션이 만들어지는 유일한 지점. 승인을 건너뛰는 경로가 없다 */
export function useApproveCoachRun(runId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CoachApproveResult>(path`/coach/runs/${runId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.coach.run(runId) });
      qc.invalidateQueries({ queryKey: qk.coach.latest(familyId) });
      // 승인으로 운동이 생겼다 — 목록 · 이번 주 링 · 리그의 잡힌 날 · 알림이 다 바뀐다
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "league"] });
      qc.invalidateQueries({ queryKey: qk.family.fitnessMap(familyId) });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** 거절해도 미션은 0건 유지. 사유가 다음 주 편성에 참고로 들어간다 */
export function useRejectCoachRun(runId: Uuid, familyId?: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      api.post<CoachRejectResult>(path`/coach/runs/${runId}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.coach.run(runId) });
      if (familyId) qc.invalidateQueries({ queryKey: qk.coach.latest(familyId) });
    },
  });
}

/** 직접 짠 운동을 그날의 운동으로 등록한다(날마다 한 건). 보호자만 할 수 있다 */
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
      /** ▲ 요청: `CreateMissionRequest.sessions`. 직접 짠 루틴의 칸들 */
      sessions?: MissionSession[];
    }) => api.post<{ missionId: Uuid }>(path`/families/${familyId}/missions`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "fitness-map"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      // 잡힌 날이 늘면 리그 달성률의 분모가 바뀐다
      qc.invalidateQueries({ queryKey: ["family", familyId, "league"] });
      // 아이 종에 「새 운동이 생겼어요」 가 뜬다 — 한 폰을 같이 쓰면 60초를 기다리지 않게(등록 · 한 칸 끝과 같다)
      qc.invalidateQueries({ queryKey: ["notifications"] });
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
    queryFn: () =>
      api.get<MissionList>(path`/families/${familyId}/missions${query({ ...options })}`),
    enabled: Boolean(familyId),
  });
}

/**
 * 지금 걸려 있는 운동 — 아직인 것과 다 한 것 둘 다.
 *
 * 서버의 `ACTIVE` 는 「아직 다 안 한 것」 이다. 그것만 받으면 아이가 다 하는 순간 오늘 운동이 목록에서
 * 빠져, 아이 홈은 「오늘 운동이 아직 없어요」, 부모 홈은 「아직 오늘 운동이 없어요」 가 된다(9/25 한 바퀴).
 * `DONE` 을 같이 받아 합친다. 오늘 것만 고르는 건 화면이 날짜로 한다. 키가 `useMissions` 와 같아 캐시를 나눠 쓴다.
 */
export function useCurrentMissions(familyId: Uuid | undefined) {
  return useQueries({
    queries: (["ACTIVE", "DONE"] as const).map((status) => ({
      queryKey: qk.family.missions(familyId ?? "", "ALL", status),
      queryFn: () =>
        api.get<MissionList>(
          path`/families/${familyId}/missions${query({ scope: "ALL", status })}`,
        ),
      enabled: Boolean(familyId),
    })),
    combine: mergeMissions,
  });
}

/**
 * 컴포넌트 밖에 둔다 — 렌더마다 새 함수면 합친 결과도 매번 새것이 된다.
 * 기다리는 중 · 못 받음을 같이 돌려준다 — 못 받은 것을 「오늘 운동이 없어요」 로 그리면
 * 부모가 같은 운동을 한 번 더 받는다. **둘 다 받아야 오늘을 말한다** — 다 한 것만 못 받으면
 * 다 한 날이 「오늘 운동이 아직 없어요」 가 되어 「AI에게 운동 받기」 가 떴다.
 */
function mergeMissions(
  results: { data?: MissionList; isPending: boolean; error: unknown; refetch: () => unknown }[],
) {
  const [active, done] = results;
  const seen = new Set<string>();
  const missions = [...(active.data?.missions ?? []), ...(done.data?.missions ?? [])].filter(
    (m) => {
      const id = m.missionId ?? "";
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    },
  );
  return {
    // 다 한 것이 오기 전에는 합치지 않는다 — 아이가 다 한 날 「오늘 운동이 아직 없어요」 가 먼저 번쩍였다
    data: active.data && done.data ? { ...active.data, missions } : undefined,
    isPending: active.isPending || done.isPending,
    error: active.error ?? done.error,
    refetch: () => results.forEach((r) => void r.refetch()),
  };
}

/** STEPS 미션의 마지막 관문. 보호자만 누를 수 있다 */
export function useConfirmParticipant(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) =>
      api.post(path`/missions/${missionId}/participants/${profileId}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "league"] });
      refreshProgress(qc);
    },
  });
}

/* ─── 응원 ─────────────────────────────────────────────────── */

/** 부모→자녀뿐 아니라 자녀→부모도 된다. 대칭이어야 감시가 아니라 응원이 된다 */
export function useSendCheer(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      stickerId,
      ...body
    }: {
      fromProfileId: string;
      toProfileId: string;
      message?: string;
      missionId?: string;
      /** 붙일 스티커. ▲ 계약에 칸이 없어 `emoji` 에 싣는다 */
      stickerId?: string;
    }) =>
      api.post<Cheer>(path`/families/${familyId}/cheers`, { ...body, emoji: stickerId ?? null }),
    onSuccess: (_saved, sent) => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "cheers"] });
      // 붙인 스티커는 그날 칸에 남는다
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      // 받는 쪽 종에 점이 뜬다. 보낸 쪽 알림은 다시 받지 않는다 — 보는 중인 「새로 온 것」 이 비지 않게
      qc.invalidateQueries({ queryKey: qk.notifications(sent.toProfileId) });
      refreshProgress(qc);
    },
  });
}

/**
 * 받은 칭찬.
 *
 * 서버는 최근 20건만 준다. 「이 운동에 벌써 알렸나 · 칭찬했나」 를 보려면 `missionId` 로 좁혀 받는다 —
 * 가족 전체 20건 안에서 찾으면 응원이 쌓인 뒤에는 그 운동의 것이 목록 밖으로 밀려 없는 것처럼 보였다.
 */
export function useCheers(familyId: Uuid | undefined, toProfileId?: Uuid, missionId?: Uuid) {
  return useQuery({
    queryKey: qk.family.cheers(familyId ?? "", toProfileId, missionId),
    queryFn: () =>
      api.get<CheerLogList>(path`/families/${familyId}/cheers${query({ toProfileId, missionId })}`),
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
        path`/families/${familyId}/calendar${query({ profileId, from: range.from, to: range.to })}`,
      ),
    enabled: Boolean(familyId && profileId),
  });
}

/**
 * 여러 구성원의 날짜별 기록을 한꺼번에 — 가족 대시보드가 이번 달을 가족 단위로 셀 때.
 * 키가 `useCalendar` 와 같아 한 사람씩 받은 것과 캐시를 나눠 쓴다.
 */
export function useFamilyCalendars(
  familyId: Uuid | undefined,
  profileIds: Uuid[],
  range: { from: string; to: string },
) {
  return useQueries({
    queries: profileIds.map((profileId) => ({
      queryKey: qk.family.calendar(familyId ?? "", profileId, range.from, range.to),
      queryFn: () =>
        api.get<CalendarView>(
          path`/families/${familyId}/calendar${query({ profileId, from: range.from, to: range.to })}`,
        ),
      enabled: Boolean(familyId && profileId),
    })),
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
      api.get<FitnessTestHistory>(path`/profiles/${profileId}/fitness-tests${query({ size: 12 })}`),
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
    queryFn: () => api.get<ProgressView>(path`/profiles/${profileId}/progress`),
    enabled: Boolean(profileId),
  });
}

/** 여러 사람의 레벨 · 업적을 한꺼번에 — 리그의 우리 가족 프로필. 키가 `useProgress` 와 같아 캐시를 나눠 쓴다 */
export function useProgresses(profileIds: Uuid[]) {
  return useQueries({
    queries: profileIds.map((profileId) => ({
      queryKey: qk.profile.progress(profileId),
      queryFn: () => api.get<ProgressView>(path`/profiles/${profileId}/progress`),
      enabled: Boolean(profileId),
    })),
  });
}

/**
 * 한 칸 끝냈다. 앱 안 타이머로 잰 시간이라 `TIMER` 로 남는다.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useCompleteSession(missionId: Uuid, familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      position,
      ...body
    }: {
      position: number;
      profileId: string;
      activeSeconds: number;
      startedAt: string;
      endedAt: string;
    }) =>
      api.post<{
        position: number;
        missionProgress: number;
        missionCompleted: boolean;
        xpGained: number;
      }>(path`/missions/${missionId}/sessions/${position}/done`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family", familyId, "missions"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      qc.invalidateQueries({ queryKey: ["family", familyId, "league"] });
      // 다 하면 부모 종에 점이 뜬다 — 한 폰을 같이 쓰면 60초를 기다리지 않게
      qc.invalidateQueries({ queryKey: ["notifications"] });
      refreshProgress(qc);
    },
  });
}

/**
 * 운동할 수 있는 시간. AI 편성의 「몇 분」 기본값이 여기서 나온다.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useAvailability(profileId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.profile.availability(profileId ?? ""),
    queryFn: () => api.get<Availability>(path`/profiles/${profileId}/availability`),
    enabled: Boolean(profileId),
  });
}

/**
 * 여러 사람의 운동할 수 있는 시간을 한꺼번에. 겹치는 요일을 셀 때 쓴다.
 * 키가 `useAvailability` 와 같아 캐시를 나눠 쓴다. 한 사람이라도 아직 못 받았으면 undefined.
 * 몇 사람만 받은 채로 겹침을 세면 받는 사이 요일이 바뀌어 보인다
 */
export function useAvailabilities(profileIds: readonly Uuid[]) {
  return useQueries({
    queries: profileIds.map((profileId) => ({
      queryKey: qk.profile.availability(profileId),
      queryFn: () => api.get<Availability>(path`/profiles/${profileId}/availability`),
    })),
    combine: allAvailability,
  });
}

/** 컴포넌트 밖에 둔다. 렌더마다 새 함수면 합친 결과도 매번 새것이 된다 */
function allAvailability(results: { data?: Availability }[]): Availability[] | undefined {
  if (results.some((r) => !r.data)) return undefined;
  return results.map((r) => r.data as Availability);
}

export function useSaveAvailability(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: AvailabilitySlot[]) =>
      api.put<Availability>(path`/profiles/${profileId}/availability`, { slots }),
    onSuccess: (saved) => {
      qc.setQueryData(qk.profile.availability(profileId), saved);
      // 시간표가 잡힌 날을 정한다 — 리그 달성률이 달라질 수 있다
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "family" && q.queryKey[2] === "league",
      });
    },
  });
}

/**
 * 운동 클립 찾기 — 키우고 싶은 힘 · 준비/본/정리 · 조용한 것 · 이름 · 즐겨찾기.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 AI 쪽 클립 표로 답한다.
 */
export function useClips(filter: {
  factor?: string | null;
  phase?: string | null;
  quiet?: boolean;
  q?: string;
  list?: "ALL" | "FAVORITES";
  profileId?: Uuid;
}) {
  return useQuery({
    queryKey: qk.clips(filter),
    queryFn: () =>
      api.get<ClipList>(
        path`/clips${query({
          factor: filter.factor ?? undefined,
          phase: filter.phase ?? undefined,
          quiet: filter.quiet ? "true" : undefined,
          q: filter.q || undefined,
          list: filter.list,
          profileId: filter.profileId,
        })}`,
      ),
    // 즐겨찾기는 누구의 것인지 알아야 한다
    enabled: filter.list !== "FAVORITES" || Boolean(filter.profileId),
    placeholderData: (previous) => previous,
  });
}

/** 운동 찾기에서 한 번에 받는 수. 끝까지 내리면 다음 페이지를 이어 받는다 */
export const CLIP_PAGE_SIZE = 40;

/**
 * 운동 찾기 목록을 한 페이지씩 받는다. 거르는 조건은 useClips 와 같고, `allAges` 를 켜면 모든 나이의 영상을 받는다
 * (끄면 보는 사람의 나이대). 다음 페이지는 앞 페이지가 준 `nextCursor` 로 부른다.
 */
export function useClipPages(filter: {
  factor?: string | null;
  phase?: string | null;
  quiet?: boolean;
  q?: string;
  list?: "ALL" | "FAVORITES";
  profileId?: Uuid;
  allAges?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ["clips", "pages", filter] as const,
    queryFn: ({ pageParam }) =>
      api.get<ClipList>(
        path`/clips${query({
          factor: filter.factor ?? undefined,
          phase: filter.phase ?? undefined,
          quiet: filter.quiet ? "true" : undefined,
          q: filter.q || undefined,
          list: filter.list,
          profileId: filter.profileId,
          ageGroup: filter.allAges ? "ALL" : undefined,
          size: String(CLIP_PAGE_SIZE),
          cursor: pageParam,
        })}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursorOf,
    enabled: filter.list !== "FAVORITES" || Boolean(filter.profileId),
    placeholderData: (previous) => previous,
  });
}

export function useToggleClipFavorite(profileId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clipId, favorited }: { clipId: string; favorited: boolean }) =>
      api.post(path`/clips/${clipId}/favorite`, { profileId, favorited }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clips"] }),
  });
}

/* ─── 알림 ────────────────────────────────────────────────── */

/**
 * 한 사람의 알림. 종의 점과 알림 화면이 같이 쓴다.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useNotifications(profileId: Uuid | undefined) {
  return useQuery({
    queryKey: qk.notifications(profileId ?? ""),
    queryFn: () => api.get<NotificationList>(path`/notifications${query({ profileId })}`),
    enabled: Boolean(profileId),
    // 아이가 「다 했어요」 를 누르면 부모 종에 점이 떠야 한다. 푸시가 없는 동안은 가끔 묻는다
    refetchInterval: 60_000,
  });
}

/**
 * 다 읽었다. **목록은 다시 받지 않고 점만 끈다** — 들어오자마자 목록을 다시 받으면
 * 이번에 새로 온 것의 표시가 사라져 무엇이 새로 왔는지 못 본다.
 */
export function useMarkNotificationsRead(profileId: Uuid | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>(path`/notifications/read`, { profileId }),
    onSuccess: () =>
      qc.setQueryData<NotificationList>(qk.notifications(profileId ?? ""), (old) =>
        old ? { ...old, unread: 0 } : old,
      ),
  });
}

/**
 * 가족 리그 — 이번 달 티어 · 달성률 · 순위.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useFamilyLeague(familyId: Uuid | undefined, month: string) {
  return useQuery({
    queryKey: qk.family.league(familyId ?? "", month),
    queryFn: () => api.get<FamilyLeague>(path`/families/${familyId}/league${query({ month })}`),
    enabled: Boolean(familyId),
  });
}

/**
 * 쉬는 날 카드 — 이번 달 남은 장 · 쓴 날.
 * ▲ 서버에 아직 없는 엔드포인트다. 목 서버가 제안 모양으로 답한다.
 */
export function useRestDays(familyId: Uuid | undefined, month: string) {
  return useQuery({
    queryKey: qk.family.restDays(familyId ?? "", month),
    queryFn: () => api.get<RestDays>(path`/families/${familyId}/rest-days${query({ month })}`),
    enabled: Boolean(familyId),
  });
}

/**
 * 여러 달의 쉬는 날을 한꺼번에 — 직접 짜기가 몇 주 되풀이할 때 달을 넘는다. 키가 `useRestDays` 와 같아 캐시를 나눠 쓴다.
 * 쓴 날(YYYY-MM-DD)을 한 묶음으로 돌려준다. 못 받은 달은 비어 있다
 */
export function useRestDaysIn(familyId: Uuid | undefined, months: string[]) {
  return useQueries({
    queries: months.map((month) => ({
      queryKey: qk.family.restDays(familyId ?? "", month),
      queryFn: () => api.get<RestDays>(path`/families/${familyId}/rest-days${query({ month })}`),
      enabled: Boolean(familyId),
    })),
    combine: (results) => new Set(results.flatMap((r) => r.data?.days ?? [])),
  });
}

/**
 * 쉬는 날 카드를 쓰거나(`date`) 되돌린다(`cancel`).
 * 쉬는 날은 달력 · 이어서 한 날 · 리그 달성률이 달라진다 — 그것만 다시 받는다(가족 것 전부를 다시 받지 않는다).
 */
export function useRestDay(familyId: Uuid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, cancel }: { date: string; cancel?: boolean }) =>
      cancel
        ? api.delete<RestDays>(path`/families/${familyId}/rest-days/${date}`)
        : api.post<RestDays>(path`/families/${familyId}/rest-days`, { date }),
    onSuccess: (rest) => {
      // 돌려받은 카드를 바로 넣는다 — 다시 받기 전까지 되돌리기 줄이 남아 한 번 더 누르면 404 였다
      if (rest?.month) qc.setQueryData(qk.family.restDays(familyId, rest.month), rest);
      void qc.invalidateQueries({ queryKey: ["family", familyId, "calendar"] });
      void qc.invalidateQueries({ queryKey: ["family", familyId, "league"] });
      void qc.invalidateQueries({ queryKey: ["family", familyId, "rest-days"] });
      refreshProgress(qc);
    },
  });
}
