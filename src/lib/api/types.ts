/**
 * 백엔드(Spring Boot)와의 계약.
 *
 * docs/erd.md 와 docs/user-flow.md 를 그대로 옮긴 것이다.
 * 백엔드에 springdoc-openapi 가 붙어 있으므로, 실제 API 가 올라오면
 * 이 파일은 `/v3/api-docs` 에서 자동 생성한 타입으로 교체한다.
 *   npx openapi-typescript http://localhost:8080/v3/api-docs -o src/lib/api/schema.ts
 *
 * 그때까지는 이 파일이 유일한 기준이다. 백엔드와 필드명이 어긋나면
 * 화면을 통째로 고쳐야 하므로, 구현 전에 이 모양으로 합의를 받아둘 것.
 */

export type Uuid = string;
/** YYYY-MM-DD */
export type IsoDate = string;
/** ISO-8601 timestamp */
export type IsoDateTime = string;

/* ─── identity ─────────────────────────────────────────────── */

export type ProfileRole = "PARENT" | "CHILD";
export type Sex = "MALE" | "FEMALE";

/** 부모 응원 모드. 코치가 미션을 어떻게 편성할지를 바꾼다. */
export type SupportMode =
  /** 응원만 — 부모 본인 미션을 만들지 않는다 */
  | "CHEER_ONLY"
  /** 주말에 같이 — 주말 미션만 만든다 */
  | "WEEKEND_TOGETHER"
  /** 나도 측정 — 부모도 아이와 같은 화면을 쓴다 */
  | "MEASURE_TOO";

export type AgeGroup = "TODDLER" | "YOUTH" | "ADULT";

export interface Family {
  id: Uuid;
  name: string;
  regionCode: string | null;
}

export interface Profile {
  id: Uuid;
  familyId: Uuid;
  /** 계정이 붙지 않은 프로필은 null. 두 살 아이, 아직 합류 안 한 남편 */
  userId: Uuid | null;
  displayName: string;
  birthDate: IsoDate;
  sex: Sex;
  role: ProfileRole;
  isOwner: boolean;
  heightCm: number | null;
  weightKg: number | null;
  supportMode: SupportMode | null;
  /** 만 4세 미만은 국민체력100 규준 자체가 없다 → 측정 버튼을 띄우지 않는다 */
  measurable: boolean;
  ageGroup: AgeGroup | null;
  age: number;
  consentPersonalAt: IsoDateTime | null;
  consentHealthAt: IsoDateTime | null;
}

export interface Cheer {
  id: Uuid;
  fromProfileId: Uuid;
  toProfileId: Uuid;
  stickerCode: string;
  message: string | null;
  createdAt: IsoDateTime;
}

export interface InviteCode {
  profileId: Uuid;
  code: string;
  expiresAt: IsoDateTime;
}

/* ─── fitness ──────────────────────────────────────────────── */

/**
 * 측정 항목. 백엔드의 Kotlin enum FitnessItem 과 1:1 이다.
 * docs 기준 초안이며, 국민체력100 활용신청 후 실제 코드와 대조가 필요하다(문서 6-1).
 */
export type FitnessItemCode =
  | "SIT_UP" // 윗몸말아올리기 (회)
  | "SIT_AND_REACH" // 앉아윗몸앞으로굽히기 (cm)
  | "SINGLE_LEG_STAND" // 외발서기 (초) — 유아
  | "GRIP_STRENGTH" // 악력 (kg) — 악력계 필요
  | "STANDING_LONG_JUMP" // 제자리멀리뛰기 (cm) — 공간 필요
  | "SHUTTLE_RUN"; // 왕복오래달리기 (회)

export type FitnessDomain =
  "MUSCLE_ENDURANCE" | "FLEXIBILITY" | "BALANCE" | "MUSCLE_STRENGTH" | "POWER" | "CARDIO";

export interface FitnessItemMeta {
  code: FitnessItemCode;
  label: string;
  unit: string;
  domain: FitnessDomain;
  /**
   * true 면 선택 입력. 악력계·넓은 공간처럼 장비가 필요한 항목이다.
   * 폼은 이 플래그로 "집에서 잴 수 있는 것 / 장비가 필요한 것" 두 구역으로 나눈다.
   */
  optionalInput: boolean;
  ageGroups: AgeGroup[];
  /** 값이 클수록 좋은 항목인지. 백분위 방향 표시에 쓴다 */
  higherIsBetter: boolean;
  hint?: string;
}

export type FitnessGrade = 1 | 2 | 3 | 4 | 5;
export type MeasurementSource = "HOME" | "CENTER";

export interface FitnessTestItem {
  item: FitnessItemCode;
  value: number;
  percentile: number | null;
  grade: FitnessGrade | null;
}

export interface FitnessTest {
  id: Uuid;
  profileId: Uuid;
  measuredOn: IsoDate;
  source: MeasurementSource;
  ageAtTest: number;
  items: FitnessTestItem[];
  /** 전체 종합 백분위 */
  overallPercentile: number | null;
  overallGrade: FitnessGrade | null;
}

export interface CreateFitnessTestRequest {
  measuredOn: IsoDate;
  source: MeasurementSource;
  items: { item: FitnessItemCode; value: number }[];
}

/** 측정 등록 실패 코드. 화면에서 문구를 갈라야 한다 */
export type FitnessErrorCode =
  "NO_MEASURED_ITEM" | "NOT_MEASURABLE_AGE" | "GUARDIAN_CONSENT_REQUIRED";

/* ─── 가족 체력 지도 (홈 메인) ──────────────────────────────── */

/** 홈 화면 전체가 이 응답 하나로 온다 — GET /families/{id}/fitness-map */
export interface FitnessMap {
  family: Family;
  members: FitnessMapMember[];
}

export interface FitnessMapMember {
  profile: Profile;
  /** "40대 상위 30%" 같은 한 줄. 측정이 없으면 null */
  headline: string | null;
  overallPercentile: number | null;
  overallGrade: FitnessGrade | null;
  /** 백분위가 가장 낮은 항목 */
  weakestItem: FitnessItemCode | null;
  /** 백분위 75 이상이면 강점으로 잡고 강화 쪽으로 전환한다 */
  strongestItem: FitnessItemCode | null;
  lastMeasuredOn: IsoDate | null;
}

/* ─── 10년 후 예측 ─────────────────────────────────────────── */

export type PredictionScenario = "BASELINE" | "IMPROVED";

export interface PredictionPoint {
  scenario: PredictionScenario;
  item: FitnessItemCode | "OVERALL";
  ageAt: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface Prediction {
  id: Uuid;
  profileId: Uuid;
  modelVersion: string;
  createdAt: IsoDateTime;
  points: PredictionPoint[];
  /**
   * 화면에서 제거할 수 없는 고지.
   * 국민체력100은 횡단면 데이터라 개인 추적이 애초에 불가능하다.
   */
  disclaimer: string;
}

/* ─── coaching ─────────────────────────────────────────────── */

export type CoachRunStatus =
  | "RUNNING"
  /** 여기서 멈춘다. 승인 전에는 missions 가 0건이다 */
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "FAILED";

export interface CoachProposalItem {
  id: Uuid;
  title: string;
  description: string;
  targetProfileIds: Uuid[];
  videoId: Uuid | null;
  /** 왜 이 운동을 골랐는지 — 근거 없는 제안은 버그로 본다 */
  rationale: string;
  targetItem: FitnessItemCode | null;
  scheduledFor: IsoDate | null;
}

export interface CoachRun {
  id: Uuid;
  familyId: Uuid;
  status: CoachRunStatus;
  createdAt: IsoDateTime;
  proposalItems: CoachProposalItem[];
  approvedAt: IsoDateTime | null;
  approvedByProfileId: Uuid | null;
  rejectedReason: string | null;
}

/** 승인 실패 코드 — 자녀 계정은 승인할 수 없다 */
export type CoachApprovalErrorCode = "PARENT_ROLE_REQUIRED" | "ALREADY_DECIDED";

export type CoachMessageRole = "USER" | "ASSISTANT";

export interface CoachCitation {
  aiDocumentId: Uuid;
  title: string;
  sourceType: "VIDEO" | "PRESCRIPTION" | "NORM";
  url: string | null;
  snippet: string;
}

export interface CoachMessage {
  id: Uuid;
  role: CoachMessageRole;
  content: string;
  /** ASSISTANT 답변에 인용이 비어 있으면 버그다 */
  citations: CoachCitation[];
  createdAt: IsoDateTime;
}

/* ─── missions & activity ──────────────────────────────────── */

export type MissionOrigin = "COACH" | "PARENT";
export type MissionStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "EXPIRED";

/**
 * 완료를 무엇으로 인증했는지.
 * 웹에서 서버가 진짜로 아는 건 영상 진행률과 앱 내 타이머 두 가지뿐이다.
 * 걸음수는 자기 신고이고, 화면에서도 그렇게 부른다.
 */
export type VerifiedBy = "VIDEO_PROGRESS" | "TIMER" | "SELF_REPORT";

export interface MissionParticipant {
  profileId: Uuid;
  displayName: string;
  status: MissionStatus;
  progressPercent: number;
  verifiedBy: VerifiedBy | null;
  completedAt: IsoDateTime | null;
}

export interface Mission {
  id: Uuid;
  familyId: Uuid;
  origin: MissionOrigin;
  title: string;
  description: string | null;
  video: ExerciseVideo | null;
  targetItem: FitnessItemCode | null;
  targetMinutes: number | null;
  dueOn: IsoDate | null;
  participants: MissionParticipant[];
  createdAt: IsoDateTime;
}

export interface MissionProgressRequest {
  profileId: Uuid;
  verifiedBy: VerifiedBy;
  /** VIDEO_PROGRESS: 0~100. 90 이상이면 서버가 완료로 판정한다 */
  progressPercent?: number;
  /** TIMER: 앱 내에서 실제로 잰 분 */
  minutes?: number;
  /** SELF_REPORT: 사람이 폰 만보계를 보고 적은 값 */
  steps?: number;
}

export interface ActivitySummary {
  familyId: Uuid;
  weekStart: IsoDate;
  members: {
    profileId: Uuid;
    displayName: string;
    totalMinutes: number;
    selfReportedSteps: number;
    completedMissions: number;
  }[];
}

/* ─── videos ───────────────────────────────────────────────── */

export type NoiseLevel = "QUIET" | "NORMAL";
export type SpaceRequirement = "SMALL_ROOM" | "LIVING_ROOM" | "OUTDOOR";

export interface ExerciseVideo {
  id: Uuid;
  youtubeVideoId: string;
  title: string;
  channelName: string;
  durationSeconds: number;
  thumbnailUrl: string;
  /** 라벨은 영상 속성이라 한 테이블에 둔다 (ADR-001) */
  domains: FitnessDomain[];
  minAge: number;
  maxAge: number;
  noiseLevel: NoiseLevel;
  spaceRequirement: SpaceRequirement;
  favorited: boolean;
}

/* ─── facilities ───────────────────────────────────────────── */

export interface Facility {
  id: string;
  name: string;
  category: string;
  address: string;
  distanceKm: number | null;
  phone: string | null;
  latitude: number;
  longitude: number;
}

/* ─── 공통 에러 ────────────────────────────────────────────── */

export interface ApiErrorBody {
  code: string;
  message: string;
}

/* ─── 주간 요약 ────────────────────────────────────────────── */

export interface WeeklyReport {
  familyId: Uuid;
  weekStart: IsoDate;
  weekEnd: IsoDate;
  totalMinutes: number;
  completedMissions: number;
  totalMissions: number;
  members: {
    profileId: Uuid;
    displayName: string;
    completedMissions: number;
    totalMissions: number;
    totalMinutes: number;
    cheersReceived: number;
  }[];
  highlight: string | null;
}

/* ─── 요청 바디 ────────────────────────────────────────────── */

export interface CreateFamilyRequest {
  name: string;
  regionCode?: string;
  owner: {
    displayName: string;
    birthDate: IsoDate;
    sex: Sex;
    heightCm?: number;
    weightKg?: number;
  };
}

export interface CreateProfileRequest {
  displayName: string;
  birthDate: IsoDate;
  sex: Sex;
  role: ProfileRole;
  heightCm?: number;
  weightKg?: number;
  /** 만 14세 미만 자녀는 보호자 동의가 필수다 */
  guardianConsent?: boolean;
}

export interface ClaimProfileRequest {
  code: string;
}

export interface CreateMissionRequest {
  title: string;
  description?: string;
  videoId?: Uuid;
  targetItem?: FitnessItemCode;
  targetMinutes?: number;
  dueOn?: IsoDate;
  participantProfileIds: Uuid[];
}

export interface CreatePredictionRequest {
  /** 몇 년 뒤를 볼 것인가. 기본 10 */
  horizonYears?: number;
}

export interface CoachChatRequest {
  profileId: Uuid;
  message: string;
}

export interface VideoRecommendQuery {
  targetItem?: FitnessItemCode;
  noiseLevel?: NoiseLevel;
  spaceRequirement?: SpaceRequirement;
}

export interface FacilityQuery {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}
