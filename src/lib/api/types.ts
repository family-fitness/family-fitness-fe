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

/* ─── 오류 ─────────────────────────────────────────────────── */

/** 실패는 한 형태다. **봉투가 있다.** */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
