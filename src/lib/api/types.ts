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
/** 가족을 만들면 돌아오는 것 — 가족 id 와 만든 사람의 프로필 */
export type FamilyCreated = S["FamilyCreatedResponse"];
export type Cheer = S["CheerResponse"];

export type FitnessMap = S["FitnessMapResponse"];
export type FitnessMapMember = S["Member"];
export type FitnessItems = S["FitnessItemsResponse"];
export type FitnessItem = S["Item"];
export type FitnessTestResult = S["FitnessTestResponse"];
export type LatestFitnessTest = S["LatestFitnessResponse"];
export type ItemResult = S["ItemResult"];
export type RadarPoint = S["RadarPointResponse"];
export type PredictionResult = S["PredictionResponse"];
/** 한 시점의 분포. p50 만 그리면 확정된 미래처럼 보인다 — p10·p90 을 같이 쓴다 */
export type PredictionPoint = S["Point"];

export type CoachRun = S["CoachRunView"];
export type CoachProposal = S["ProposalView"];
export type CoachApproveResult = S["ApproveCoachRunView"];

export type MissionList = S["MissionListView"];
export type Mission = S["MissionView"];

export type VideoList = S["VideoListView"];

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
  /**
   * 붙인 스티커(`STICKERS` 의 id). 글로만 보낸 칭찬이면 null.
   * ▲ 요청: `CheerRequest.stickerId` · 조회 응답에도. 지금은 계약의 `emoji` 칸에 싣는다
   */
  stickerId?: string | null;
  /** ISO-8601 */
  createdAt: string;
}

export interface CheerLogList {
  cheers: CheerLog[];
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
  /**
   * 이 사람이 끝냈나. 서버가 칸에 싣는 값이 아니라 `sessionsOf(mission, profileId)` 가
   * 그 사람의 `doneSessions` 로 채운다 — 끝냄은 칸이 아니라 사람마다다
   */
  completed?: boolean;
  verifiedBy?: VerifiedBy | null;
}

/** 서버가 세션을 붙여 줄 수 있다 */
export type MissionWithSessions = Mission & { sessions?: MissionSession[] | null };

/**
 * 미션의 참여자 한 사람.
 *
 * ▲ 요청: `MissionParticipantView.doneSessions` — 이 사람이 끝낸 칸의 position.
 * 칸 하나에 끝냄을 하나만 두면 형제가 같은 운동을 받았을 때 한 아이가 끝낸 칸이
 * 다른 아이에게도 끝난 칸이 된다.
 */
export type MissionParticipant = NonNullable<Mission["participants"]>[number] & {
  doneSessions?: number[] | null;
};
export type ProposalWithSessions = CoachProposal & {
  sessions?: MissionSession[] | null;
  /** 이번 주 어느 요일에 넣을지. ▲ 요청: `ProposalView.days` */
  days?: string[] | null;
};

/**
 * 하루치 기록. 캘린더 한 칸, 주간 막대 한 칸이 이것 하나다.
 *
 * ▲ 요청: `GET /families/{familyId}/calendar?profileId=&from=&to=`
 * 지금은 미션 목록과 칭찬 목록을 따로 받아 날짜별로 다시 모아야 하는데,
 * 미션은 기간(startDate~endDate)만 있고 **그날 몇 분 했는지**가 없다.
 * 날짜별 합은 서버만 정확히 낸다 — 활동 기록(`activityDate`)을 가진 쪽이 서버다.
 *
 * 아무것도 안 한 날은 `days` 에 넣지 않는다. 빈 날을 「0분」 으로 채워 보내면
 * 화면이 그날을 빠진 날처럼 그리기 쉽다.
 */
export interface DayLog {
  /** YYYY-MM-DD. 한국 날짜 */
  date: string;
  /** 그날 확인된 운동 시간(분). 영상 · 타이머로 서버가 아는 것만 */
  minutes: number;
  /** 그날 잡혀 있던 시간(분). 등록한 운동이 없던 날은 null */
  plannedMinutes: number | null;
  entries: DayEntry[];
  /** 그날 받은 칭찬 스티커 */
  stickers: StickerLog[];
  /**
   * 쉬는 날 카드를 쓴 날. 빈 날이 아니라 「쉬기로 한 날」 이다 — 이어서 한 날이 끊기지 않고
   * 리그 달성률에서 빠진다. ▲ 요청: 캘린더 응답에 `rest`
   */
  rest?: boolean;
}

/** 그날 한 운동 하나 */
export interface DayEntry {
  missionId: Uuid;
  title: string;
  minutes: number;
  verifiedBy: VerifiedBy | null;
  completed: boolean;
  /** 준비 · 본 · 정리 칸. 칸이 없는 운동은 null */
  sessions?: { title: string; phase: SessionPhase; minutes: number | null; done: boolean }[] | null;
}

/**
 * 받은 칭찬 스티커 한 장.
 *
 * ▲ 요청: `CheerRequest.stickerId`. 지금은 계약의 `emoji` 칸에 스티커 코드를 싣는다 —
 * 화면에 이모지를 쓰지 않아서 그 칸은 비어 있었다.
 */
export interface StickerLog {
  cheerId: Uuid;
  stickerId: string;
  fromProfileId: Uuid;
  fromName: string;
  message: string | null;
  missionId: Uuid | null;
  /** ISO-8601 */
  createdAt: string;
}

export interface CalendarView {
  profileId: Uuid;
  from: string;
  to: string;
  days: DayLog[];
}

/**
 * 측정 이력 한 회차.
 *
 * ▲ 요청: `GET /profiles/{profileId}/fitness-tests?size=`
 * `latest` 하나만 있어서 점수 흐름과 키 · 몸무게가 자란 모습을 그릴 수 없다.
 */
export interface FitnessTestSummary {
  fitnessTestId: Uuid;
  /** YYYY-MM-DD */
  testedOn: string;
  overallPercentile: number | null;
  heightCm: number | null;
  weightKg: number | null;
}

export interface FitnessTestHistory {
  tests: FitnessTestSummary[];
}

/**
 * 레벨 · 경험치 · 업적 · 연속.
 *
 * ▲ 요청: `GET /profiles/{profileId}/progress`
 * 회의에서 정한 대로 **계산은 서버가 한다**(레벨 · 경험치 · 업적 판정). 프론트는 꾸미기만 한다 —
 * 두 곳에서 따로 세면 아이 화면과 부모 화면의 레벨이 어긋난다.
 *
 * 경험치는 운동을 한 만큼 쌓이는 값이다. **체력 점수가 아니고, 줄지 않는다.**
 */
export interface ProgressView {
  profileId: Uuid;
  level: number;
  /** 지금까지 모은 경험치 */
  xp: number;
  /** 이 레벨이 시작된 경험치 */
  levelFloorXp: number;
  /** 다음 레벨이 되는 경험치. 마지막 레벨이면 null */
  nextLevelXp: number | null;
  /** 며칠 이어서 했나. 오늘 아직 안 했어도 어제까지 이어졌으면 센다 */
  streakDays: number;
  /**
   * 지금까지 운동한 날. 키움 섬의 나무 수다 — 줄지 않는다.
   * ▲ 요청: `ProgressView.activeDays`. 안 오면 섬에 나무 없이 캐릭터만 선다
   */
  activeDays?: number;
  achievements: AchievementView[];
  /** 최근에 경험치가 들어온 까닭 몇 줄 */
  recentXp: XpEvent[];
}

export interface AchievementView {
  code: string;
  /** 서버가 정한 이름. 화면에서 고쳐 쓰지 않는다 */
  title: string;
  /** 어떻게 얻는지 */
  description: string;
  /** ISO-8601. 아직이면 null */
  earnedAt: string | null;
}

export interface XpEvent {
  reason: string;
  amount: number;
  /** ISO-8601 */
  at: string;
}

/** 요일. 한 주는 월요일에 시작한다 */
export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

/**
 * 운동할 수 있는 시간 — 한 사람의 한 주.
 *
 * ▲ 요청: `GET · PUT /profiles/{profileId}/availability`
 * AI 편성이 「몇 분」 의 기본값으로 쓴다. 이 시간이 아니라고 운동을 막지는 않는다 —
 * 추천이 시간으로 정해지는 게 아니라 언제 하겠다는 약속이다(9/23 회의).
 */
export interface AvailabilitySlot {
  day: Weekday;
  /** HH:mm, 한국 시각 */
  start: string;
  minutes: number;
}

export interface Availability {
  profileId: Uuid;
  slots: AvailabilitySlot[];
}

/**
 * 운동 클립 — 영상 속 한 동작.
 *
 * ▲ 요청: `GET /clips?factor=&phase=&quiet=&q=&list=&profileId=` · `POST /clips/{clipId}/favorite`
 * 지금 계약의 영상(`VideoView`)은 한 편 단위라, 한 편 안에 든 여러 동작을 따로 고를 수 없다.
 * AI 쪽이 이미 영상 48편을 491개 클립으로 끊어 두었다(`video_clips.csv`) — 그 표를 그대로 주세요.
 */
export interface ClipView {
  clipId: string;
  videoId: string;
  startSec: number;
  endSec: number;
  /** 화면에 뜬 운동 이름 */
  title: string;
  factor: FitnessFactor | null;
  phase: SessionPhase;
  /** 집에서 할 수 있나 */
  homeOk: boolean;
  /** 쿵쿵 소리가 안 나나 */
  quiet: boolean;
  /** 도구가 필요한가 */
  props: boolean;
  favorited: boolean;
}

export interface ClipList {
  clips: ClipView[];
  /** 조건에 맞는 전체 수. 목록은 앞의 일부만 온다 */
  total: number;
}

/* ─── 오류 ─────────────────────────────────────────────────── */

/** 실패는 한 형태다. **봉투가 있다.** */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

/**
 * 알림 한 줄.
 *
 * ▲ 요청: `GET /notifications?profileId=` · `POST /notifications/read {profileId}`
 * 문구(`title` · `body`)는 서버가 짓고 화면은 그대로 내보낸다(규칙 9). 어느 화면으로 갈지는
 * `kind` 와 참조(`aboutProfileId` · `missionId` · `date`)로 화면이 정한다.
 */
export type NotificationKind =
  /** 부모에게 — 아이가 운동을 마쳤다 */
  | "KID_DONE"
  /** 부모에게 — 측정한 지 한 달이 지났다 */
  | "REMEASURE"
  /** 아이에게 — 스티커 · 칭찬을 받았다 */
  | "PRAISE"
  /** 아이에게 — 오늘 운동이 생겼다 */
  | "MISSION_READY"
  /** 아이에게 — 새 업적 */
  | "ACHIEVEMENT"
  /** 부모에게 — 아이가 고마워요 스티커를 보냈다 */
  | "KID_THANKS";

export interface NotificationView {
  notificationId: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  /** 누구에 관한 알림인가. 부모 알림이면 그 아이 */
  aboutProfileId: Uuid | null;
  /**
   * 누가 보냈나 — 스티커 · 칭찬 · 고마워요. 아이가 고마워요를 돌려보낼 곳이다.
   * ▲ 요청: `NotificationView.fromProfileId`
   */
  fromProfileId?: Uuid | null;
  missionId: Uuid | null;
  /** YYYY-MM-DD. 캘린더 그날로 갈 때 */
  date: string | null;
  stickerId: string | null;
  /** ISO-8601 */
  createdAt: string;
  read: boolean;
}

export interface NotificationList {
  items: NotificationView[];
  /** 안 읽은 수. 화면은 숫자를 쓰지 않고 점 하나만 찍는다 */
  unread: number;
}

/* ─── 가족 리그 · 쉬는 날 카드 ─────────────────────────────── */

/** 리그 티어 — 아래부터 브론즈 · 실버 · 골드 · 플래티넘 · 다이아 */
export type LeagueTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";

/**
 * 가족 리그 — 이번 달 우리 가족이 있는 리그와 순위.
 *
 * 겨루는 값은 체력이 아니라 **목표 달성률**이다(잡힌 운동 날 중 해낸 날, 쉬는 날 뺌, 아이들 평균).
 * 운동 잘하는 집도 식구 많은 집도 유리하지 않다. 가족 단위로만 겨룬다 — 집 안에서 누가 더 했는지는
 * 어디에도 나오지 않는다(규칙 10). 달이 바뀌면 위 `promote` 집은 한 티어 올라가고 아래 `demote` 집은 내려간다.
 *
 * ▲ 요청: `GET /families/{familyId}/league?month=YYYY-MM`
 */
export interface FamilyLeague {
  month: string;
  tier: LeagueTier;
  /**
   * 이번 달 목표 달성률(%). **셀 날이 아직 없으면 null** — 달의 첫날 아침, 막 들어온 가족.
   * 0 으로 주면 「0% · 꼴찌 · 내려가요」 가 된다. 비어 있음은 비어 있게(규칙 8)
   */
  rate: number | null;
  /** 이 리그 묶음에서 우리 가족 자리(1부터). 달성률이 없으면 null */
  rank: number | null;
  groupSize: number;
  /** 달이 바뀌면 올라가는 · 내려가는 자리 수. 맨 위 · 맨 아래 티어는 0 */
  promote: number;
  demote: number;
  /** 이 달이 끝나기까지 남은 날 */
  daysLeft: number;
  /** 달성률 순. 이름은 가족 이름만. 달성률이 아직 없는 집은 맨 아래 */
  standings: { familyName: string; rate: number | null; me: boolean }[];
}

/**
 * 쉬는 날 카드 — 한 달에 `perMonth` 장. 쓴 날은 「안 한 날」 이 아니라 「쉬기로 한 날」.
 * ▲ 요청: `GET · POST /families/{familyId}/rest-days` · `DELETE /families/{familyId}/rest-days/{date}`
 */
export interface RestDays {
  month: string;
  perMonth: number;
  left: number;
  /** 쓴 날(YYYY-MM-DD) */
  days: string[];
}
