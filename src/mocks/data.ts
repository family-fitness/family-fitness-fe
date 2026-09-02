/**
 * 목 데이터.
 *
 * 문서에 나온 엣지 케이스를 한 가족 안에 전부 넣었다. 화면을 만들 때
 * "측정 기록이 없는 사람", "측정 자체가 불가능한 아이", "아직 합류 안 한 부모"를
 * 매번 따로 만들지 않아도 되게 하기 위해서다.
 *
 * | 구성원 | 상태 | 화면에서 확인할 것 |
 * |---|---|---|
 * | 박지현 (41, 엄마) | 계정 연결됨 · 측정 있음 · MEASURE_TOO | 정상 카드 |
 * | 이상현 (43, 아빠) | 계정 없음 · 초대 대기 | 초대코드 발급 흐름 |
 * | 이하준 (9, 첫째) | 측정 있음 · 유연성 약점 | 약점 기반 추천 |
 * | 이서아 (3, 둘째) | measurable=false | 측정 버튼이 아예 안 뜨는지 |
 * | 이도윤 (7, 셋째) | 측정 없음 · headline=null | "첫 측정을 등록하면" 빈 상태 |
 */
import type {
  ActivitySummary,
  CoachMessage,
  CoachRun,
  ExerciseVideo,
  Facility,
  Family,
  FitnessMap,
  FitnessTest,
  Mission,
  Prediction,
  Profile,
  WeeklyReport,
} from "@/lib/api/types";

export const FAMILY_ID = "11111111-1111-4111-8111-111111111111";

const P = {
  mom: "22222222-2222-4222-8222-222222222201",
  dad: "22222222-2222-4222-8222-222222222202",
  hajun: "22222222-2222-4222-8222-222222222203",
  seoa: "22222222-2222-4222-8222-222222222204",
  doyun: "22222222-2222-4222-8222-222222222205",
} as const;

export const PROFILE_IDS = P;

export const family: Family = {
  id: FAMILY_ID,
  name: "하준이네",
  regionCode: "11305",
};

export const profiles: Profile[] = [
  {
    id: P.mom,
    familyId: FAMILY_ID,
    userId: "33333333-3333-4333-8333-333333333301",
    displayName: "박지현",
    birthDate: "1985-04-12",
    sex: "FEMALE",
    role: "PARENT",
    isOwner: true,
    heightCm: 162.5,
    weightKg: 55.2,
    supportMode: "MEASURE_TOO",
    measurable: true,
    ageGroup: "ADULT",
    age: 41,
    consentPersonalAt: "2026-08-20T09:00:00Z",
    consentHealthAt: "2026-08-20T09:00:00Z",
  },
  {
    // 아직 로그인 안 한 아빠. 프로필만 먼저 만들어 두고 초대코드로 가져간다
    id: P.dad,
    familyId: FAMILY_ID,
    userId: null,
    displayName: "이상현",
    birthDate: "1983-11-03",
    sex: "MALE",
    role: "PARENT",
    isOwner: false,
    heightCm: 176.0,
    weightKg: 74.8,
    supportMode: "WEEKEND_TOGETHER",
    measurable: true,
    ageGroup: "ADULT",
    age: 42,
    consentPersonalAt: null,
    consentHealthAt: null,
  },
  {
    id: P.hajun,
    familyId: FAMILY_ID,
    userId: null,
    displayName: "이하준",
    birthDate: "2017-06-21",
    sex: "MALE",
    role: "CHILD",
    isOwner: false,
    heightCm: 133.4,
    weightKg: 29.1,
    supportMode: null,
    measurable: true,
    ageGroup: "YOUTH",
    age: 9,
    consentPersonalAt: "2026-08-20T09:02:00Z",
    consentHealthAt: "2026-08-20T09:02:00Z",
  },
  {
    // 만 4세 미만. 국민체력100 규준 자체가 없어서 측정 버튼이 뜨면 안 된다
    id: P.seoa,
    familyId: FAMILY_ID,
    userId: null,
    displayName: "이서아",
    birthDate: "2023-02-14",
    sex: "FEMALE",
    role: "CHILD",
    isOwner: false,
    heightCm: 95.0,
    weightKg: 14.2,
    supportMode: null,
    measurable: false,
    ageGroup: null,
    age: 3,
    consentPersonalAt: "2026-08-20T09:03:00Z",
    consentHealthAt: "2026-08-20T09:03:00Z",
  },
  {
    // 측정 기록이 아직 없다. 홈에서 headline=null 빈 상태를 확인하기 위한 프로필
    id: P.doyun,
    familyId: FAMILY_ID,
    userId: null,
    displayName: "이도윤",
    birthDate: "2019-09-30",
    sex: "MALE",
    role: "CHILD",
    isOwner: false,
    heightCm: 118.2,
    weightKg: 21.4,
    supportMode: null,
    measurable: true,
    ageGroup: "TODDLER",
    age: 6,
    consentPersonalAt: "2026-08-20T09:04:00Z",
    consentHealthAt: "2026-08-20T09:04:00Z",
  },
];

export const fitnessTests: Record<string, FitnessTest> = {
  [P.mom]: {
    id: "44444444-4444-4444-8444-444444444401",
    profileId: P.mom,
    measuredOn: "2026-08-24",
    source: "HOME",
    ageAtTest: 41,
    items: [
      { item: "SIT_UP", value: 32, percentile: 68, grade: 2 },
      { item: "SIT_AND_REACH", value: 14.5, percentile: 55, grade: 3 },
      { item: "GRIP_STRENGTH", value: 26.4, percentile: 61, grade: 3 },
    ],
    overallPercentile: 62,
    overallGrade: 3,
  },
  [P.hajun]: {
    id: "44444444-4444-4444-8444-444444444402",
    profileId: P.hajun,
    measuredOn: "2026-08-26",
    source: "CENTER",
    ageAtTest: 9,
    items: [
      { item: "SIT_UP", value: 28, percentile: 74, grade: 2 },
      // 약점. 코치가 유연성 운동을 제안하는 근거가 된다
      { item: "SIT_AND_REACH", value: 3.2, percentile: 18, grade: 5 },
      { item: "STANDING_LONG_JUMP", value: 142, percentile: 81, grade: 1 },
      { item: "SHUTTLE_RUN", value: 42, percentile: 63, grade: 3 },
    ],
    overallPercentile: 59,
    overallGrade: 3,
  },
};

export const fitnessMap: FitnessMap = {
  family,
  members: [
    {
      profile: profiles[0],
      headline: "40대 여성 중 상위 38%",
      overallPercentile: 62,
      overallGrade: 3,
      weakestItem: "SIT_AND_REACH",
      strongestItem: "SIT_UP",
      lastMeasuredOn: "2026-08-24",
    },
    {
      profile: profiles[1],
      headline: null,
      overallPercentile: null,
      overallGrade: null,
      weakestItem: null,
      strongestItem: null,
      lastMeasuredOn: null,
    },
    {
      profile: profiles[2],
      headline: "또래 남자아이 중 상위 41%",
      overallPercentile: 59,
      overallGrade: 3,
      weakestItem: "SIT_AND_REACH",
      strongestItem: "STANDING_LONG_JUMP",
      lastMeasuredOn: "2026-08-26",
    },
    {
      profile: profiles[3],
      headline: null,
      overallPercentile: null,
      overallGrade: null,
      weakestItem: null,
      strongestItem: null,
      lastMeasuredOn: null,
    },
    {
      profile: profiles[4],
      headline: null,
      overallPercentile: null,
      overallGrade: null,
      weakestItem: null,
      strongestItem: null,
      lastMeasuredOn: null,
    },
  ],
};

export const videos: ExerciseVideo[] = [
  {
    id: "55555555-5555-4555-8555-555555555501",
    youtubeVideoId: "dQw4w9WgXcQ",
    title: "어린이 유연성 스트레칭 5분",
    channelName: "국민체육진흥공단",
    durationSeconds: 312,
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    domains: ["FLEXIBILITY"],
    minAge: 6,
    maxAge: 12,
    noiseLevel: "QUIET",
    spaceRequirement: "SMALL_ROOM",
    favorited: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555502",
    youtubeVideoId: "M7lc1UVf-VE",
    title: "층간소음 없는 우리집 코어 운동",
    channelName: "국민체육진흥공단",
    durationSeconds: 458,
    thumbnailUrl: "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg",
    domains: ["MUSCLE_ENDURANCE", "BALANCE"],
    minAge: 7,
    maxAge: 15,
    noiseLevel: "QUIET",
    spaceRequirement: "SMALL_ROOM",
    favorited: false,
  },
  {
    id: "55555555-5555-4555-8555-555555555503",
    youtubeVideoId: "kJQP7kiw5Fk",
    title: "부모와 함께하는 주말 스트레칭",
    channelName: "국민체육진흥공단",
    durationSeconds: 620,
    thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
    domains: ["FLEXIBILITY", "MUSCLE_STRENGTH"],
    minAge: 6,
    maxAge: 60,
    noiseLevel: "NORMAL",
    spaceRequirement: "LIVING_ROOM",
    favorited: false,
  },
];

/**
 * 코치 실행 결과. status 가 AWAITING_APPROVAL 이라 **미션은 아직 0건이다.**
 * 이 상태에서 화면이 "미션"이라는 단어를 쓰면 규칙 위반이다.
 */
export const coachRun: CoachRun = {
  id: "66666666-6666-4666-8666-666666666601",
  familyId: FAMILY_ID,
  status: "AWAITING_APPROVAL",
  createdAt: "2026-08-30T11:00:00Z",
  proposalItems: [
    {
      id: "66666666-6666-4666-8666-666666666611",
      title: "앉아서 다리 뻗기 스트레칭",
      description: "매일 저녁 5분. 영상을 따라 하면 됩니다.",
      targetProfileIds: [P.hajun],
      videoId: videos[0].id,
      rationale:
        "하준이의 앉아윗몸앞으로굽히기가 또래 상위 82% 위치로 6개 항목 중 가장 낮습니다. 유연성은 짧게 자주 하는 편이 효과가 커서 매일 5분으로 잡았습니다.",
      targetItem: "SIT_AND_REACH",
      scheduledFor: "2026-09-01",
    },
    {
      id: "66666666-6666-4666-8666-666666666612",
      title: "주말 가족 스트레칭",
      description: "토요일 오전에 온 가족이 함께 10분.",
      targetProfileIds: [P.mom, P.hajun],
      videoId: videos[2].id,
      rationale:
        "지현님의 응원 모드가 '나도 측정'이라 본인 미션도 함께 편성했습니다. 두 분 모두 유연성이 약점이라 같은 운동으로 묶었습니다.",
      targetItem: "SIT_AND_REACH",
      scheduledFor: "2026-09-05",
    },
  ],
  approvedAt: null,
  approvedByProfileId: null,
  rejectedReason: null,
};

/** 승인 전에는 빈 배열이다. 승인 핸들러가 여기에 채워 넣는다 */
export const missions: Mission[] = [];

export const activity: ActivitySummary = {
  familyId: FAMILY_ID,
  weekStart: "2026-08-31",
  members: [
    {
      profileId: P.mom,
      displayName: "박지현",
      totalMinutes: 42,
      selfReportedSteps: 18400,
      completedMissions: 1,
    },
    {
      profileId: P.hajun,
      displayName: "이하준",
      totalMinutes: 65,
      selfReportedSteps: 24100,
      completedMissions: 2,
    },
    {
      profileId: P.doyun,
      displayName: "이도윤",
      totalMinutes: 20,
      selfReportedSteps: 9800,
      completedMissions: 0,
    },
  ],
};

export const weeklyReport: WeeklyReport = {
  familyId: FAMILY_ID,
  weekStart: "2026-08-24",
  weekEnd: "2026-08-30",
  totalMinutes: 127,
  completedMissions: 3,
  totalMissions: 5,
  members: [
    {
      profileId: P.mom,
      displayName: "박지현",
      completedMissions: 1,
      totalMissions: 2,
      totalMinutes: 42,
      cheersReceived: 2,
    },
    {
      profileId: P.hajun,
      displayName: "이하준",
      completedMissions: 2,
      totalMissions: 2,
      totalMinutes: 65,
      cheersReceived: 5,
    },
    {
      profileId: P.doyun,
      displayName: "이도윤",
      completedMissions: 0,
      totalMissions: 1,
      totalMinutes: 20,
      cheersReceived: 3,
    },
  ],
  highlight: "하준이가 이번 주 미션을 모두 마쳤어요.",
};

/**
 * 10년 후 예측.
 * BASELINE 은 지금 그대로, IMPROVED 는 지금 같이 시작했을 때다.
 * disclaimer 는 화면에서 접거나 숨길 수 없다.
 */
export const prediction: Prediction = {
  id: "77777777-7777-4777-8777-777777777701",
  profileId: P.hajun,
  modelVersion: "lgbm-quantile-2026.08",
  createdAt: "2026-08-30T12:00:00Z",
  disclaimer:
    "집단 데이터 기반 참고용 추정이며 의학적 진단이 아닙니다. 국민체력100은 횡단면 조사라 개인의 미래를 추적한 값이 아니라, 지금과 같은 조건인 위 연령대 집단의 분포를 보여 줍니다.",
  points: buildPredictionPoints(),
};

function buildPredictionPoints() {
  const points: Prediction["points"] = [];
  const startAge = 9;

  for (let i = 0; i <= 10; i += 1) {
    const age = startAge + i;
    // BASELINE — 지금 백분위(18)를 대체로 유지한다
    const base = 18 + i * 0.6;
    points.push({
      scenario: "BASELINE",
      item: "SIT_AND_REACH",
      ageAt: age,
      p10: Math.round((base - 9 - i * 0.4) * 10) / 10,
      p50: Math.round(base * 10) / 10,
      p90: Math.round((base + 11 + i * 0.5) * 10) / 10,
    });
    // IMPROVED — 주 3회 유연성 운동을 이어갔을 때
    const improved = 18 + i * 4.1;
    points.push({
      scenario: "IMPROVED",
      item: "SIT_AND_REACH",
      ageAt: age,
      p10: Math.round((improved - 10 - i * 0.6) * 10) / 10,
      p50: Math.round(Math.min(improved, 88) * 10) / 10,
      p90: Math.round(Math.min(improved + 12 + i * 0.4, 97) * 10) / 10,
    });
  }
  return points;
}

/** ASSISTANT 답변에는 항상 근거가 붙는다. 비어 있으면 버그다 */
export const coachMessages: CoachMessage[] = [
  {
    id: "88888888-8888-4888-8888-888888888801",
    role: "USER",
    content: "우리 애가 유연성이 약한데 층간소음 없이 할 수 있는 운동 있어?",
    citations: [],
    createdAt: "2026-08-30T13:00:00Z",
  },
  {
    id: "88888888-8888-4888-8888-888888888802",
    role: "ASSISTANT",
    content:
      "하준이(9세)는 앉아윗몸앞으로굽히기가 또래 대비 낮은 편이라 정적 스트레칭부터 시작하는 게 좋습니다. 층간소음 걱정이 있으시면 뛰는 동작이 없는 앉은 자세 스트레칭 위주로 골랐습니다. 하루 5분, 주 4회 정도가 적당합니다.",
    citations: [
      {
        aiDocumentId: "99999999-9999-4999-8999-999999999901",
        title: "어린이 유연성 스트레칭 5분",
        sourceType: "VIDEO",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        snippet: "앉은 자세로 진행해 층간소음이 발생하지 않는 6~12세 대상 유연성 프로그램",
      },
      {
        aiDocumentId: "99999999-9999-4999-8999-999999999902",
        title: "층간소음 없는 우리집 코어 운동",
        sourceType: "VIDEO",
        url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        snippet: "매트 위 정적 동작 중심. 점프 동작 없음",
      },
      {
        aiDocumentId: "99999999-9999-4999-8999-999999999903",
        title: "유소년 유연성 운동처방 지침",
        sourceType: "PRESCRIPTION",
        url: null,
        snippet: "정적 스트레칭은 1회 15~30초 유지, 주 4회 이상 반복 시 개선 폭이 큽니다.",
      },
    ],
    createdAt: "2026-08-30T13:00:04Z",
  },
];

export const facilities: Facility[] = [
  {
    id: "fac-001",
    name: "정릉국민체육센터",
    category: "공공체육시설",
    address: "서울 성북구 보국문로 91",
    distanceKm: 0.8,
    phone: "02-909-0114",
    latitude: 37.6108,
    longitude: 127.0125,
  },
  {
    id: "fac-002",
    name: "성북구민회관 수영장",
    category: "수영장",
    address: "서울 성북구 화랑로 63",
    distanceKm: 1.9,
    phone: "02-2241-6600",
    latitude: 37.6042,
    longitude: 127.0189,
  },
  {
    id: "fac-003",
    name: "북한산생태공원 다목적운동장",
    category: "야외운동장",
    address: "서울 성북구 정릉동 산 1-1",
    distanceKm: 2.4,
    phone: null,
    latitude: 37.6201,
    longitude: 127.0021,
  },
];
