/**
 * 백엔드 계약.
 *
 * 스키마는 `src/lib/api/schema.ts` 에 서버의 /v3/api-docs 에서 자동 생성한다.
 * 손으로 쓰지 않는다 — 백엔드가 DTO 를 바꾸면 여기서 타입 에러로 드러나야 한다.
 *
 *   npm run api:types      # 서버가 켜져 있을 때
 *
 * 이 파일은 생성된 스키마에 사람이 부르기 쉬운 이름을 붙이는 곳이다.
 */
import type { components } from "./schema";

type S = components["schemas"];

/* ─── 공통 타입 (docs/api-contract.md §0) ──────────────────── */

export type Uuid = string;
/** YYYY-MM-DD */
export type IsoDate = string;
/** ISO-8601 */
export type IsoDateTime = string;

export type Role = "PARENT" | "CHILD";
export type Sex = "M" | "F";

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
 * 백분위 구간.
 *
 * 등급(1·2·3·참가)과 별개다. 화면에서는 band 를 쓴다 —
 * 등급은 서열이고 band 는 상태라서, 아이에게 보여도 낙인이 되지 않는다.
 * 코드값(strength 등)을 화면에 그대로 쓰지 않는다. BAND_COPY 를 쓴다.
 */
export type Band = "strength" | "steady" | "growth";

/**
 * 국민체력100 등급. **1·2·3 과 「참가」뿐이다.** 4·5등급은 없다.
 * 규준에 못 미쳐도 「참가」다 — 「미달」이나 「하위」라는 말이 서버에서 오지 않는다.
 * 측정했지만 규준이 없는 연령(만 7~10세 일부)이면 null 이다.
 */
export type Grade = NonNullable<S["ItemResult"]["grade"]>;
export type ValueRange = S["ValueRange"];

export type TargetMetric = "VIDEO_DONE" | "TIMER_MINUTES" | "STEPS";
export type ActivitySource = "MANUAL" | "TIMER" | "VIDEO";
export type VerifiedBy = "VIDEO_PROGRESS" | "TIMER" | "SELF_REPORT";
export type InviteStatus = "NONE" | "ISSUED" | "EXPIRED" | "CLAIMED";
export type MissionOrigin = "COACH" | "MANUAL";
export type CoachRunStatus = "RUNNING" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "FAILED";
export type FitnessTestSource = "SELF_INPUT" | "CENTER_SHEET";
export type InputGroup = "EASY" | "EQUIPMENT";
export type CoachDirection = "GROWTH" | "STRENGTHEN";
/** 코치가 정하는 편성 역할. 프로필 역할(role)과 다르다 */
export type CoachRole = "주행자" | "동반자" | "응원";

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
/** 구성원의 최근 측정 요약. 없으면 null 이 온다 */
export type MemberLatest = S["Latest"];
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
export type MissionVideo = S["MissionVideoView"];

export type VideoList = S["VideoListView"];
export type Video = S["VideoView"];
export type VideoLabel = S["VideoLabel"];

export type WeeklyReport = S["WeeklyReportView"];

/* ─── 아직 서버에 없는 것 ──────────────────────────────────── */

/**
 * **주의 — 이 아래는 생성된 스키마가 아니다.**
 *
 * 백엔드에 아직 없는 엔드포인트의 제안 모양이다. 손으로 썼고, 목 서버가 이 모양으로
 * 응답한다. 서버에 올라오면 지우고 `schema.ts` 에서 가져온다.
 *
 * 왜 먼저 만드는가 — 도장을 보내는 길(POST cheers)은 있는데 **받은 걸 보는 길이 없다.**
 * 부모가 찍은 도장을 아이가 못 보면 도장 기능 자체가 성립하지 않는다.
 * 화면을 다 만들어 두고 요청해야 무엇이 필요한지 정확히 말할 수 있다.
 *
 * ▲ 요청: `GET /families/{familyId}/cheers?toProfileId=&size=`
 */
export interface CheerLog {
  cheerId: Uuid;
  fromProfileId: Uuid;
  fromName: string;
  toProfileId: Uuid;
  message: string | null;
  /** 도장 종류 키. 「stamp-star」처럼 우리 그림 이름이다. 이모지가 아니다 */
  stamp: string | null;
  missionId: Uuid | null;
  createdAt: IsoDateTime;
}

export interface CheerLogList {
  cheers: CheerLog[];
}

/* ─── 오류 ─────────────────────────────────────────────────── */

/**
 * 실패는 한 형태다. **봉투가 있다.**
 *   {"error": {"code": "...", "message": "..."}}
 *
 * message 는 개발자용이라 화면에 그대로 노출하지 않는다(api-contract §0).
 */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
