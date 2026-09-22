/**
 * 백엔드 계약. 타입은 손으로 쓰지 않는다 — `npm run api:types` 가 서버의
 * /v3/api-docs 에서 `schema.ts` 를 만든다. 여기는 이름만 붙이는 곳이다.
 */
import type { components } from "./schema";

type S = components["schemas"];

/* ─── 공통 타입 (docs/api-contract.md §0) ──────────────────── */

export type Uuid = string;

export type Role = "PARENT" | "CHILD";

/** PARENT 만 가진다. 다음 주 코치 편성과 홈 화면을 바꾼다 */
export type SupportMode = "CHEER_ONLY" | "WEEKEND" | "FULL";

/**
 * 연령대. **값이 한글이다.**
 * 유아기는 만 0~6 이지만 만 4세 미만은 measurable=false 다.
 */
export type AgeGroup = "유아기" | "유소년" | "청소년" | "성인" | "어르신";

/** 국민체력100 체력 요인. 값이 한글이다 */
export type FitnessFactor =
  "심폐지구력" | "근력" | "근지구력" | "유연성" | "민첩성" | "순발력" | "협응력" | "평형성";

/**
 * 백분위 구간. 등급은 서열이고 band 는 상태다 — 아이 화면에는 band 를 쓴다.
 * 코드값(strength)을 그대로 쓰지 않고 `BAND_COPY` 를 거친다.
 */
export type Band = "strength" | "steady" | "growth";

/** 국민체력100 등급. **1·2·3 과 「참가」뿐이다.** 4·5등급은 없다. */
export type Grade = NonNullable<S["ItemResult"]["grade"]>;
export type ValueRange = S["ValueRange"];

export type TargetMetric = "VIDEO_DONE" | "TIMER_MINUTES" | "STEPS";
export type VerifiedBy = "VIDEO_PROGRESS" | "TIMER" | "SELF_REPORT";
export type FitnessTestSource = "SELF_INPUT" | "CENTER_SHEET";

/** 앱 진입 시 어디로 보낼지 */
export type NextStep = "CREATE_FAMILY" | "CLAIM" | "HOME" | "SUPPORT_MODE";

/**
 * band 를 화면 문구로 바꾼다.
 * 코드값을 그대로 노출하지 않는다는 규칙 때문에 필요하다(api-contract §0).
 */
export const BAND_COPY: Record<Band, string> = {
  strength: "잘하고 있는 영역",
  steady: "꾸준히 하고 있는 영역",
  growth: "지금 키우기 좋은 영역",
};

/* ─── 생성된 스키마에 이름 붙이기 ──────────────────────────── */
/* 오른쪽 이름은 서버가 정한 것이다. 바뀌면 여기서 타입 에러로 드러난다 */

/** identity 가 내보내는 유일한 공개 언어. Profile 엔티티는 나오지 않는다 */
export type ProfileSummary = S["ProfileSummary"];
export type MeResponse = S["MeResponse"];
export type AuthResponse = S["AuthResponse"];
export type FamilyProfiles = S["FamilyProfilesResponse"];
export type InviteCode = S["InviteResponse"];
export type Cheer = S["CheerResponse"];

export type FitnessMap = S["FitnessMapResponse"];
export type FitnessMapMember = S["Member"];
export type FitnessItems = S["FitnessItemsResponse"];
export type FitnessItem = S["Item"];
export type FitnessTestResult = S["FitnessTestResponse"];
export type LatestFitnessTest = S["LatestFitnessResponse"];
export type ItemResult = S["ItemResult"];
export type RadarPoint = S["RadarPointResponse"];
export type FactorPoint = S["FactorPoint"];
export type PredictionResult = S["PredictionResponse"];
/** 한 시점의 분포. p50 만 그리면 확정된 미래처럼 보인다 — p10·p90 을 같이 쓴다 */
export type PredictionPoint = S["Point"];

export type CoachRun = S["CoachRunView"];
export type CoachProposal = S["ProposalView"];
export type CoachStep = S["CoachStep"];
export type CoachApproveResult = S["ApproveCoachRunView"];
export type CoachChatResult = S["ChatView"];
export type ChatCitation = S["ChatCitationView"];

export type MissionList = S["MissionListView"];
export type Mission = S["MissionView"];
export type MissionParticipant = S["MissionParticipantView"];

export type VideoList = S["VideoListView"];
export type Video = S["VideoView"];
export type VideoLabel = S["VideoLabel"];

export type WeeklyReport = S["WeeklyReportView"];

/* ─── 아직 서버에 없는 것 ──────────────────────────────────── */

/**
 * **주의 — 이 아래는 생성된 스키마가 아니다.**
 * ▲ 요청: `GET /families/{familyId}/cheers?toProfileId=&size=`
 */
export interface CheerLog {
  cheerId: Uuid;
  fromProfileId: Uuid;
  fromName: string;
  toProfileId: Uuid;
  message: string | null;
  missionId: Uuid | null;
  /** ISO-8601 */
  createdAt: string;
}

export interface CheerLogList {
  cheers: CheerLog[];
}

/**
 * 코치가 대화 중에 내놓는 미션 제안.
 *
 * ▲ 요청: `POST /coach/chat` 응답에 `suggestion?` 을 붙여 주세요.
 * 값이 그대로 `POST /families/{familyId}/missions` 요청 본문이 됩니다 —
 * 부모가 카드의 버튼 한 번으로 미션을 만들 수 있게 하려는 것입니다.
 * 없으면 화면은 지금처럼 답변만 보여 줍니다.
 */
export interface MissionSuggestion {
  title: string;
  targetMetric: TargetMetric;
  targetValue: number;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
  videoId?: string | null;
  videoTitle?: string | null;
  participantProfileIds: Uuid[];
  /** 왜 이 미션인지 한 줄 */
  rationale?: string | null;
}

/**
 * 측정 회차에 같이 적어 둔 키 · 몸무게.
 *
 * ▲ 요청: `GET /profiles/{profileId}/fitness-tests/latest` 응답에 붙여 주세요.
 * 등록할 때 받아 두고도 돌려주지 않아, 방금 적은 값이 저장하자마자 화면에서
 * 사라집니다. 지금은 기기에 따로 들고 있어서 기기를 바꾸면 없어집니다.
 */
export type LatestWithBody = LatestFitnessTest & {
  heightCm?: number | null;
  weightKg?: number | null;
};

/**
 * 프로필에 붙는 성별.
 *
 * ▲ 요청: `ProfileSummary` 에 `sex` 를 돌려주세요.
 * 가족을 만들 때(`OwnerRequest`) 와 구성원을 더할 때(`AddMemberRequest`) 는
 * 받으면서 조회 응답에는 없습니다. 그래서 아바타 몸을 프로필 번호 해시로
 * 고르고 있고, 아빠가 절반의 확률로 엄마 모습으로 그려집니다.
 * 국민체력100 규준 자체가 성별로 나뉘어 있어 어차피 서버가 아는 값입니다.
 */
export type ProfileWithSex = ProfileSummary & { sex?: "M" | "F" | null };

/**
 * 초대코드가 어느 자리인지 미리 보기.
 *
 * ▲ 요청: `GET /invites/{claimCode}`.
 * 코드는 **가족 전체가 아니라 자리 하나**에 발급된다(`POST /profiles/{id}/invite`).
 * 그런데 받는 쪽 화면은 그걸 모른 채 코드를 넣고 나서야 자기가 누가 됐는지 안다.
 * 넣기 전에 「서준이네 · 아빠 자리」 를 보여 줘야 **역할을 고를 수 없다**는 것이
 * 화면에서 사실이 된다.
 *
 * 없는 코드는 404, 기한이 지났으면 410 을 주세요.
 */
export interface InvitePeek {
  familyName: string;
  /** 이 코드가 가리키는 자리 */
  profileName: string;
  role: Role;
  ageGroup?: AgeGroup | null;
  /** 누가 보냈는지 */
  invitedByName?: string | null;
  /** ISO-8601 */
  expiresAt?: string | null;
}

/**
 * 영상 속 **구간**.
 *
 * 국민체력100 운동처방 하나가 영상 한 편이 아니라 영상 **안의 한 토막**이다.
 * 「초등학생 기초체력」 12분짜리 한 편에 준비운동·본운동·정리운동이 다 들어 있다.
 *
 * ▲ 요청: `VideoView.chapters[]` 와 `ProposalVideoView.endSec`.
 * 지금 계약에는 `startSec` 만 있어서 **구간의 끝을 모른다.** 끝을 모르면 구간
 * 재생도 구간 완주 판정도 안 된다 — 영상 전체 90%를 봐야 완주로 치는 지금
 * 규칙으로는 90초짜리 구간만 한 아이가 영원히 완주에 못 닿는다.
 */
export interface VideoClip {
  videoId: string;
  /** 초 단위. 없으면 영상 처음부터 */
  startSec?: number | null;
  /** 초 단위. **없으면 구간이 아니라 영상 한 편이다** */
  endSec?: number | null;
  title?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
}

/** 준비 · 본 · 정리. 하루치 미션이 이 셋으로 나뉜다 */
export type SessionPhase = "WARMUP" | "MAIN" | "COOLDOWN";

/**
 * 미션 한 건 안의 세션 하나.
 *
 * ▲ 요청: `MissionView.sessions[]` · `ProposalView.sessions[]` ·
 * `CreateMissionRequest.sessions[]` · `POST /missions/{id}/sessions/{position}/done`.
 *
 * **안 오면 지어내지 않는다.** 세션이 없으면 화면은 본운동 한 칸만 그린다 —
 * 준비운동과 정리운동을 프론트가 만들어 붙이면 코치가 짜지 않은 운동을
 * 아이에게 시키는 게 된다.
 */
export interface MissionSession {
  /** 1부터. 순서가 곧 하는 차례다 */
  position: number;
  phase: SessionPhase;
  title: string;
  factor?: string | null;
  /** 이 세션에 잡힌 시간(분) */
  minutes?: number | null;
  clip?: VideoClip | null;
  completed?: boolean;
  verifiedBy?: VerifiedBy | null;
}

/** 서버가 세션을 붙여 줄 수 있다 */
export type MissionWithSessions = Mission & { sessions?: MissionSession[] | null };
export type ProposalWithSessions = CoachProposal & {
  sessions?: MissionSession[] | null;
  /** 이번 주 어느 요일에 넣을지. ▲ 요청: `ProposalView.days` */
  days?: string[] | null;
};

/** 서버 응답에 제안이 붙어 올 수 있다 */
export type CoachChatAnswer = CoachChatResult & { suggestion?: MissionSuggestion | null };

/* ─── 오류 ─────────────────────────────────────────────────── */

/** 실패는 한 형태다. **봉투가 있다.** */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
