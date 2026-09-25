/**
 * 목 서버의 상태.
 *
 * 가짜 서버가 들고 있는 가족 · 미션 · 칭찬과, 그것을 탭 저장소에 남기고 되살리는 일.
 * 요청 처리기(`handlers.ts` 와 기능별 파일)는 여기서 읽고 여기에 쓴다.
 */
import { HttpResponse } from "msw";

import type {
  CheerLog,
  FitnessTestSummary,
  LeagueTier,
  ApiErrorBody,
  Band,
  CoachRun,
  FamilyProfiles,
  FitnessItems,
  FitnessMap,
  LatestFitnessTest,
  MeResponse,
  Mission,
  PredictionResult,
  ProfileSummary,
} from "@/lib/api/types";

import { dayOf } from "@/lib/today";

import clipsJson from "./clips.json";
import fixturesJson from "./fixtures.json";

/** 픽스처의 모양. */
/** 선택 표시(`?`)만 걷어낸다. */
export type Concrete<T> = T extends (infer U)[]
  ? Concrete<U>[]
  : T extends object
    ? { [K in keyof T]-?: Concrete<T[K]> }
    : T;

interface Fixtures {
  me: MeResponse;
  profiles: FamilyProfiles;
  fitnessMap: FitnessMap;
  itemsByAgeGroup: Record<string, FitnessItems>;
  latestByProfile: Record<string, LatestFitnessTest>;
  coachRun: CoachRun;
  prediction: PredictionResult;
}

export const fixtures = fixturesJson as unknown as Concrete<Fixtures>;

/** 클립 목록. `db` 를 채우기 전에 있어야 한다 — 오늘 미션을 이걸로 짠다 */
export const catalog = clipsJson as CatalogClip[];

/**
 * 시연 가족 아이의 측정을 다섯 요인까지 채운다.
 *
 * 픽스처(실제 서버 응답)는 세 항목만 잰 회차라 육각형이 여섯 중 셋만 차서 얇은
 * 삼각형이 된다 — 첫 화면에서 이 그래프가 무엇을 말하는지 전해지지 않는다.
 * 두 항목(윗몸말아올리기 · 제자리멀리뛰기)을 더 잰 것으로 둔다.
 * 반복옆뛰기(민첩성)는 **일부러 안 잰 채로** 둔다 — 안 잰 요인을 비워 그리는 것도
 * 첫 화면에서 보여야 한다(규칙 8).
 */
const KID_ID = "00000000-0000-4000-8000-000000000012";
const KID_EXTRA = [
  {
    itemCode: "009",
    itemLabel: "윗몸말아올리기",
    unit: "회",
    value: 27,
    percentile: 58,
    grade: "3등급",
    band: "steady",
    topPercentText: "상위 42%",
  },
  {
    itemCode: "022",
    itemLabel: "제자리멀리뛰기",
    unit: "cm",
    value: 156,
    percentile: 66,
    grade: "2등급",
    band: "steady",
    topPercentText: "상위 34%",
  },
];

/**
 * 시연 가족 부모의 측정. 체력 지도는 엄마 62 · 아빠 29 로 잰 사람인데 픽스처의 `latest` 는 빈 회차라,
 * 대시보드는 점수를 말하고 측정 결과 화면은 「아직 재지 않았어요」 를 말했다. 지도와 같은 날 · 같은 점수로 채운다
 */
const PARENT_TESTS: Record<string, { testedOn: string; items: [string, number, number][] }> = {
  "00000000-0000-4000-8000-000000000011": {
    testedOn: "2026-09-10",
    // [항목, 값, 백분위] — 평균 62
    items: [
      ["012", 14, 70],
      ["019", 32, 58],
      ["041", 0.52, 55],
      ["028", 58, 65],
    ],
  },
  "00000000-0000-4000-8000-000000000013": {
    testedOn: "2026-08-30",
    // 평균 29 — 건강검진에서 경고를 받은 아빠(도현)
    items: [
      ["012", 2, 18],
      ["019", 20, 30],
      ["041", 0.44, 28],
      ["028", 48, 40],
    ],
  },
};

function parentLatest(
  profileId: string,
  test: (typeof PARENT_TESTS)[string],
): Concrete<LatestFitnessTest> {
  const catalogue = fixtures.itemsByAgeGroup["성인"]?.items ?? [];
  const items = test.items.map(([itemCode, value, percentile]) => {
    const meta = catalogue.find((i) => i.itemCode === itemCode);
    return {
      itemCode,
      itemLabel: meta?.itemLabel ?? itemCode,
      unit: meta?.unit ?? "",
      value,
      percentile,
      grade:
        percentile >= 90
          ? "1등급"
          : percentile >= 75
            ? "2등급"
            : percentile >= 50
              ? "3등급"
              : "참가",
      band: bandOf(percentile),
      topPercentText: `상위 ${100 - percentile}%`,
    };
  });
  const factorOf = (code: string) => catalogue.find((i) => i.itemCode === code)?.factor ?? "유연성";
  const sorted = [...items].sort((a, b) => a.percentile - b.percentile);
  const edge = (i: (typeof items)[number]) => ({
    factor: factorOf(i.itemCode),
    itemCode: i.itemCode,
    percentile: i.percentile,
  });
  const factors = ["심폐지구력", "근력", "근지구력", "유연성", "민첩성", "순발력"];
  return {
    fitnessTestId: `00000000-0000-4000-8000-0000000000${profileId.slice(-2)}`,
    testedOn: test.testedOn,
    radar: factors.map((factor) => ({
      factor,
      percentile: items.find((i) => factorOf(i.itemCode) === factor)?.percentile ?? null,
    })),
    items,
    weakest: edge(sorted[0]),
    strongest: edge(sorted[sorted.length - 1]),
    coachDirection: "GROWTH",
    disclaimer: fixtures.fitnessMap.disclaimer,
  } as unknown as Concrete<LatestFitnessTest>;
}

function demoLatest() {
  const all = structuredClone(fixtures.latestByProfile);
  for (const [id, test] of Object.entries(PARENT_TESTS)) all[id] = parentLatest(id, test);
  const kid = all[KID_ID];
  if (!kid) return all;
  kid.items = [...kid.items, ...(KID_EXTRA as typeof kid.items)];
  const byFactor: Record<string, number | null> = {
    심폐지구력: 79,
    근력: 50,
    근지구력: 58,
    유연성: 24,
    민첩성: null,
    순발력: 66,
  };
  kid.radar = Object.entries(byFactor).map(([factor, percentile]) => ({
    factor,
    percentile,
  })) as typeof kid.radar;
  return all;
}

/**
 * 지난 측정 회차들. 봄 · 여름 · 가을 석 달 간격.
 *
 * 마지막 회차는 `latest` 와 같은 날 · 같은 점수여야 한다 — 두 화면이 다른 숫자를
 * 말하면 어느 쪽도 믿을 수 없다.
 */
function seedTests(): Record<string, FitnessTestSummary[]> {
  const row = (id: string, testedOn: string, p: number, h: number, w: number) => ({
    fitnessTestId: id,
    testedOn,
    overallPercentile: p,
    heightCm: h,
    weightKg: w,
  });
  return {
    [KID_ID]: [
      row("00000000-0000-4000-8000-0000000000t3", "2026-09-07", 55, 139, 34),
      row("00000000-0000-4000-8000-0000000000t2", "2026-06-08", 49, 136.4, 32.6),
      row("00000000-0000-4000-8000-0000000000t1", "2026-03-11", 44, 133.1, 30.9),
    ],
    "00000000-0000-4000-8000-000000000011": [
      row("00000000-0000-4000-8000-0000000000u2", "2026-09-10", 62, 163, 56),
      row("00000000-0000-4000-8000-0000000000u1", "2026-04-20", 57, 163, 57.4),
    ],
    "00000000-0000-4000-8000-000000000013": [
      row("00000000-0000-4000-8000-0000000000v1", "2026-08-30", 29, 176, 81),
    ],
  };
}

/** 아이는 월 · 수 · 금 저녁과 토요일 오전, 엄마는 토요일 오전에 같이 */
/** 시연 가족이 처음 적어 둔 운동 시간. 지난 기록은 이 요일로 심는다 — 지금 시간표를 고쳐도 지난날은 그대로 */
export const DEMO_SCHEDULE: Readonly<
  Record<string, readonly { day: string; start: string; minutes: number }[]>
> = seedAvailability();

function seedAvailability(): Record<string, { day: string; start: string; minutes: number }[]> {
  return {
    [KID_ID]: [
      { day: "MON", start: "19:00", minutes: 20 },
      { day: "WED", start: "19:00", minutes: 20 },
      { day: "FRI", start: "19:00", minutes: 20 },
      { day: "SAT", start: "10:00", minutes: 30 },
    ],
    "00000000-0000-4000-8000-000000000011": [{ day: "SAT", start: "10:00", minutes: 30 }],
  };
}

/** 다섯 항목 평균 55. 서버가 그러듯 목도 머리말을 같이 바꾼다 */
function demoMap() {
  const map = structuredClone(fixtures.fitnessMap);
  for (const m of map.members) {
    if (m.profileId === KID_ID && m.latest) {
      m.latest.overallPercentile = 55;
      m.headline = "유소년 상위 45%";
    }
  }
  return map;
}

/** 목 서버가 만들고 고치는 값들. 응답과 같은 모양이어야 화면이 진짜처럼 돈다 */
/**
 * 목이 돌려주는 프로필.
 *
 * `sex` 는 생성된 스키마에 아직 없다 — 가족을 만들 때는 받으면서 조회 응답에는
 * 안 돌려준다(`BACKEND_ASKS.md`). 목은 요청한 모양대로 돌려준다.
 */
export type Profile = Concrete<ProfileSummary> & {
  sex?: "M" | "F";
  /** 목만 든다 — 동의를 다시 줬을 때 만 4세가 넘었는지 다시 보려고 */
  birthDate?: string;
};
export type MapMember = Concrete<FitnessMap>["members"][number];
export type MissionRow = Concrete<Mission>;
/** 참여자 한 사람 — 끝낸 칸을 사람마다 든다(`MissionParticipant.doneSessions`) */
export type ParticipantRow = MissionRow["participants"][number] & { doneSessions: number[] };
/** 미션의 칸. ▲ 서버에 아직 없다 */
export type SessionRow = { position: number; minutes?: number | null };

/** 미션에 든 칸 */
export function sessionsOfRow(m: MissionRow): SessionRow[] {
  return (m as unknown as { sessions?: SessionRow[] }).sessions ?? [];
}

/** 참여자 한 사람 */
export function participantOf(m: MissionRow, profileId: string): ParticipantRow | undefined {
  return (m.participants ?? []).find((p) => p.profileId === profileId) as
    ParticipantRow | undefined;
}

export const BASE = "/api/v1";
const CHEER_KEY = "ff-mock-cheers";
const MISSION_KEY = "ff-mock-missions";
const RUN_KEY = "ff-mock-run";
const ACTING_KEY = "ff-mock-acting";
const STAGE_KEY = "ff-mock-stage";
const FAMILY_KEY = "ff-mock-family";
const REST_KEY = "ff-mock-rest";
/** 측정 · 측정 이력 · 키 몸무게 · 운동 시간 · 코치를 돌렸는지 · 리그 티어 */
const EXTRA_KEY = "ff-mock-extra";

export const DEMO = {
  familyId: "00000000-0000-4000-8000-000000000010",
  mom: "00000000-0000-4000-8000-000000000011",
  kid: "00000000-0000-4000-8000-000000000012",
  dad: "00000000-0000-4000-8000-000000000013",
} as const;

/** 지난 코치 회차. 이미 승인해서 돌아가고 있는 미션들이 여기서 나왔다 */
const PAST_RUN_ID = "00000000-0000-4000-8000-0000000000a0";

/* ─── 서버 상태 ────────────────────────────────────────────── */

/**
 * 탭이 살아 있는 동안 남는다(sessionStorage) — 새 탭을 열면 서준이네부터다.
 *
 * 가족만 남기고 측정을 잊으면, 새 계정으로 첫 측정을 하고 새로고침한 순간 「아직 재지 않았어요」 로
 * 돌아가고 리그가 브론즈에서 골드로 바뀌었다(9/25 한 바퀴). 바뀌는 것은 전부 남긴다.
 */
export const db = {
  profiles: loadFamily("profiles", fixtures.profiles),
  fitnessMap: loadFamily("fitnessMap", demoMap()),
  latest: loadExtra("latest", demoLatest()),
  /** 측정 이력. 점수 흐름과 키 · 몸무게가 자란 모습을 그린다 */
  tests: loadExtra("tests", seedTests()),
  /** 운동할 수 있는 시간. 사람마다 한 주 */
  availability: loadExtra("availability", seedAvailability()),
  coachRun: loadCoachRun(),
  /** 이번 주 제안은 아직 0건이다. 심어 둔 것은 지난 회차에서 승인한 미션들이다 */
  missions: loadMissions(),
  /** 주고받은 칭찬 · 알림. */
  cheers: loadCheers(),
  /**
   * 측정 회차에 같이 적은 키 · 몸무게.
   * ▲ 서버는 받아 두고도 `latest` 로 돌려주지 않는다. 목에서는 돌려준다.
   */
  body: loadExtra("body", demoBody()),
  /**
   * 지금 로그인해서 보고 있는 사람.
   * 새로고침해도 남아야 한다 — 바꾸자마자 되돌아가면 자녀 계정 화면을 볼 수 없다.
   */
  actingProfileId: loadActing(),
  /** 이 계정이 어디까지 와 있나 — 가족 없음 · 초대 대기 · 가족 있음 */
  stage: loadStage(),
  /**
   * 이번 주 코치 회차를 한 번이라도 돌렸나.
   * 새로 만든 가족은 아직 안 돌렸다 — `latest` 가 404 여야 「제안 만들기」 가 뜬다.
   */
  hasCoachRun: loadExtra("hasCoachRun", true),
  /** 쉬는 날 카드를 쓴 날(YYYY-MM-DD). 가족 단위 — 그날은 가족 모두의 「쉬기로 한 날」 */
  restDays: loadRestDays(),
  /** 이번 달 가족 리그 티어. 시연 가족은 골드, 새로 만든 가족은 브론즈에서 시작한다 */
  leagueTier: loadExtra<LeagueTier>("leagueTier", "GOLD"),
};

/** 키 · 몸무게 — 시연 가족 */
function demoBody(): Record<string, { heightCm: number; weightKg: number }> {
  return {
    [DEMO.kid]: { heightCm: 139, weightKg: 34 },
    [DEMO.mom]: { heightCm: 163, weightKg: 56 },
    [DEMO.dad]: { heightCm: 176, weightKg: 81 },
  };
}

type ExtraKey = "latest" | "tests" | "availability" | "body" | "hasCoachRun" | "leagueTier";

function loadExtra<T>(key: ExtraKey, fallback: T): T {
  try {
    const saved = sessionStorage.getItem(`${EXTRA_KEY}-${key}`);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
  return fallback;
}

/** 바꾼 것을 탭 저장소에 — 새로고침해도 방금 한 일이 없던 일이 되지 않게 */
export function saveExtra(...keys: ExtraKey[]) {
  try {
    for (const key of keys) sessionStorage.setItem(`${EXTRA_KEY}-${key}`, JSON.stringify(db[key]));
  } catch {
    // 저장이 안 돼도 이번 화면에서는 돈다
  }
}

/**
 * 서준이네로 되돌린다 — 새 계정으로 가족을 만든 탭에서 시연 계정으로 다시 들어올 때.
 * 안 그러면 시연 계정(엄마)이 방금 만든 남의 집을 본다.
 */
export function resetToDemo() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("ff-mock-")) sessionStorage.removeItem(key);
    }
  } catch {
    // 저장소가 없으면 지울 것도 없다
  }
  db.profiles = structuredClone(fixtures.profiles);
  db.fitnessMap = demoMap();
  db.latest = demoLatest();
  db.tests = seedTests();
  db.availability = seedAvailability();
  db.coachRun = structuredClone(fixtures.coachRun);
  db.missions = seedMissions();
  db.cheers = seedCheers();
  db.body = demoBody();
  db.hasCoachRun = true;
  db.restDays = [];
  db.leagueTier = "GOLD";
}

/**
 * 지금 로그인한 계정이 어디까지 와 있나.
 *
 * 전에는 "초대받는 계정인가" 불리언 하나였다. 그러면 **가족이 아직 없는 계정**을
 * 만들 수가 없어서 `POST /families` 로 가는 길이 아예 없었다 — 처음 쓰는 사람의
 * 경로를 한 번도 못 돌아 본 이유다.
 *
 * | 단계    | `/me` 가 주는 nextStep | 무엇                          |
 * | ------- | ---------------------- | ----------------------------- |
 * | `fresh` | `CREATE_FAMILY`        | 가족이 없다. 만드는 것부터     |
 * | `claim` | `CLAIM`                | 초대코드를 넣어야 가족에 붙는다 |
 * | `home`  | `HOME`                 | 가족이 있다                    |
 */
type Stage = "fresh" | "claim" | "home";

function loadStage(): Stage {
  try {
    const saved = sessionStorage.getItem(STAGE_KEY);
    if (saved === "fresh" || saved === "claim" || saved === "home") return saved;
  } catch {
    return "home";
  }
  return "home";
}

export function setStage(value: Stage) {
  db.stage = value;
  try {
    sessionStorage.setItem(STAGE_KEY, value);
  } catch {
    // 브라우저가 아니면 그냥 넘어간다
  }
}

function loadActing(): string {
  try {
    return sessionStorage.getItem(ACTING_KEY) ?? DEMO.mom;
  } catch {
    return DEMO.mom;
  }
}

/**
 * 탭 저장소에서 되살린다. 없으면 **이미 쓰던 가족**으로 시작한다.
 *
 * 빈 상태로 시작하면 칭찬 화면도, 부모 홈의 오늘도, 기념 표시도 전부 빈 화면이다.
 * 시연에서 처음 보는 화면이 전부 "아직 없어요" 면 이 앱이 무엇을 하는지 보여 줄
 * 기회가 없다. 첫 화면부터 며칠치 기록이 쌓여 있어야 순환이 보인다.
 */
function loadCheers(): CheerLog[] {
  try {
    const saved = sessionStorage.getItem(CHEER_KEY);
    if (saved) return JSON.parse(saved) as CheerLog[];
  } catch {
    return seedCheers();
  }
  return seedCheers();
}

/**
 * 며칠 전 몇 시.
 *
 * 오늘 것은 **지금보다 앞선 시각이 되면 안 된다** — 새벽에 열면 저녁 7시가
 * 미래가 되고, 화면이 아직 오지 않은 일을 이미 일어난 일처럼 보여 준다.
 */
function daysAgo(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(days === 0 ? Math.min(hour, d.getHours()) : hour, 12, 0, 0);
  return d.toISOString();
}

/**
 * 이번 주에 오간 말들. 날짜는 늘 오늘 기준이라 언제 열어도 이번 주다.
 *
 * 오는 순서가 중요하다 — 아이가 알리면(`missionId` 있음) 부모가 답한다.
 * 그 짝이 맞아야 부모 홈의 "오늘" 이 기다리는 줄과 답한 줄을 가른다.
 *
 * **오늘 것 하나는 답이 없는 채로 둔다.** 부모가 앱을 열었을 때 할 일이
 * 하나 있어야 이 서비스가 무엇을 하는지 한 화면에서 보인다.
 */
function seedCheers(): CheerLog[] {
  type Row = {
    from: string;
    to: string;
    msg: string;
    mission: string | null;
    days: number;
    sticker?: string;
  };
  const rows: Row[] = [
    // 어제 — 아이가 다 했다고 알렸고 엄마 · 아빠가 스티커로 답했다
    { from: DEMO.kid, to: DEMO.mom, msg: "운동 다 했어요!", mission: null, days: 1 },
    {
      from: DEMO.mom,
      to: DEMO.kid,
      msg: "끝까지 한 게 제일 멋있어",
      mission: null,
      days: 1,
      sticker: "flag",
    },
    { from: DEMO.dad, to: DEMO.kid, msg: "슝 빨라졌어", mission: null, days: 1, sticker: "rocket" },
    // 사흘 전
    { from: DEMO.mom, to: DEMO.kid, msg: "최고야", mission: null, days: 3, sticker: "star" },
  ];
  const nameOf = (id: string) =>
    fixtures.profiles.profiles.find((p) => p.profileId === id)?.name ?? "가족";

  return rows.map((row, i) => ({
    cheerId: `seed-cheer-${i}`,
    fromProfileId: row.from,
    fromName: nameOf(row.from),
    toProfileId: row.to,
    message: row.msg,
    missionId: row.mission,
    stickerId: row.sticker ?? null,
    createdAt: daysAgo(row.days, row.from === DEMO.kid ? 17 : 21),
  }));
}

/**
 * 운동 클립 목록 — 영상 속 한 동작.
 *
 * AI 쪽이 국민체력100 유튜브 영상 48편을 화면 글자로 읽어 끊어 낸 491개다
 * (`family-fitness-ai` develop, `data/release/video_clips.csv` + `clip_labels.csv`).
 * 유튜브 아이디 · 시작 · 끝이 진짜라 시연에서 영상이 그대로 돈다.
 */
export interface CatalogClip {
  id: string;
  videoId: string;
  startSec: number;
  endSec: number;
  title: string;
  factor: string | null;
  phase: "WARMUP" | "MAIN" | "COOLDOWN";
  homeOk: boolean;
  quiet: boolean;
  props: boolean;
}

/** 영상 속 한 토막. ▲ `endSec` 는 계약에 없다 — 목에서는 준다 */
function clip(c: Pick<CatalogClip, "videoId" | "startSec" | "endSec" | "title">) {
  return {
    videoId: c.videoId,
    startSec: c.startSec,
    endSec: c.endSec,
    title: c.title,
    url: `https://www.youtube.com/watch?v=${c.videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${c.videoId}/mqdefault.jpg`,
  };
}

/**
 * 조건에 맞는 클립을 n 개. 같은 이름은 한 번만 — 「거북이 스트레칭」 이 여러 영상에
 * 되풀이되는데, 한 번에 두 번 시키면 짜 놓은 운동이 아니라 반복이다.
 * `skip` 만큼 건너뛰어 같은 조건이라도 날마다 다른 것을 고를 수 있게 한다.
 */
function pickClips(where: (c: CatalogClip) => boolean, n: number, skip = 0): CatalogClip[] {
  const seen = new Set<string>();
  const out: CatalogClip[] = [];
  const pool = catalog.filter(where);
  for (let i = 0; i < pool.length && out.length < n; i++) {
    const c = pool[(i + skip) % pool.length];
    if (seen.has(c.title)) continue;
    // 20초짜리 토막은 따라 하기엔 너무 짧다
    if (c.endSec - c.startSec < 35) continue;
    seen.add(c.title);
    out.push(c);
  }
  return out;
}

/**
 * 오늘 한 칸씩. 준비 2 · 본 2 · 정리 2 로 짜는 것이 AI 편성의 기본 모양이다(9/23 회의).
 * 칸마다 **잡힌 시간**이 있고 영상은 그 동안 따라 할 시범이다 — 영상이 1분이어도
 * 4분을 하라고 하면 4분 동안 되풀이된다.
 */
export function sessionsFor(
  focus: string,
  minutes: number,
  options: { quiet?: boolean; skip?: number } = {},
) {
  const { quiet = true, skip = 0 } = options;
  const ok = (c: CatalogClip) => c.homeOk && !c.props && (!quiet || c.quiet);
  // 본운동은 시간이 길수록 가짓수를 늘린다 — 한 동작을 13분씩 되풀이시키지 않는다.
  // 준비 2 · 정리 2 에 본운동 2~6, 모두 열 칸을 넘기지 않는다(회의: 열 개 넘으면 짜증난다)
  const mainCount = Math.min(6, Math.max(2, Math.round((minutes - 4) / 4)));
  const warm = pickClips((c) => ok(c) && c.phase === "WARMUP" && c.factor === "유연성", 2, skip);
  const main = pickClips((c) => ok(c) && c.phase === "MAIN" && c.factor === focus, mainCount, skip);
  const cool = pickClips((c) => ok(c) && c.phase === "COOLDOWN", 2, skip);
  // 조용한 본운동이 모자라면(순발력은 거의 다 뛰는 동작이다) 그 힘을 기르는 다른 동작으로 채운다 —
  // 본운동이 비어 4분짜리가 되거나, 한 동작을 20분 되풀이하지 않게
  if (main.length < 2) {
    const more = pickClips(
      (c) =>
        c.homeOk &&
        !c.props &&
        c.phase === "MAIN" &&
        c.factor === focus &&
        !main.some((m) => m.title === c.title),
      mainCount - main.length,
      skip,
    );
    main.push(...more);
  }
  // 준비 · 정리는 1분씩, 남는 시간을 본운동이 나눈다. 나머지는 앞 칸부터 1분씩 더한다
  const mainTotal = Math.max(main.length, minutes - warm.length - cool.length);
  const base = Math.floor(mainTotal / Math.max(1, main.length));
  const extra = mainTotal - base * main.length;
  const rows = [
    ...warm.map((c) => ({ c, minutes: 1 })),
    ...main.map((c, i) => ({ c, minutes: base + (i < extra ? 1 : 0) })),
    ...cool.map((c) => ({ c, minutes: 1 })),
  ];
  return rows.map(({ c, minutes: m }, i) => ({
    position: i + 1,
    phase: c.phase,
    title: c.title,
    factor: c.factor,
    minutes: m,
    clip: clip(c),
  }));
}

/**
 * 오늘 돌아가는 미션.
 *
 * 아이는 오늘 운동 여섯 칸 중 준비운동 둘을 끝내 둔 상태다 — 아이 홈에는 「이어서 하기」,
 * 부모 홈에는 링이 조금 찬 모습이 뜬다. 직접 적은 걸음수 기록 하나는 보호자 확인을
 * 기다린다(규칙 2). 지난날의 기록은 `history.ts` 가 날짜별로 따로 답한다.
 */
function seedMissions(): MissionRow[] {
  const today = dayOf(daysAgo(0, 12));
  const sessions = sessionsFor("유연성", 12);
  return [
    {
      missionId: "seed-today",
      title: "유연성 키우기 12분",
      origin: "COACH",
      coachRunId: PAST_RUN_ID,
      targetMetric: "TIMER_MINUTES",
      targetValue: 12,
      serverVerifiable: true,
      startDate: today,
      endDate: today,
      rationale: "유연성이 가장 낮아요. 늘이는 동작을 준비와 정리에 같이 넣었어요.",
      video: null,
      sessions,
      participants: [
        {
          profileId: DEMO.kid,
          name: "서준",
          progress: 2 / 12,
          completed: false,
          verifiedBy: "TIMER",
          needsGuardianCheck: false,
          doneSessions: [1, 2],
        },
      ],
    },
    {
      /*
        직접 적은 기록. **목표를 넘겨도 완료가 아니다** — 보호자가 확인해야
        완료가 된다(도메인 규칙 2). 부모 홈에 "확인해 주기" 가 하나 떠 있어야
        이 규칙이 화면에서 보인다.
      */
      missionId: "seed-steps",
      title: "학교까지 걸어가기",
      origin: "MANUAL",
      coachRunId: null,
      targetMetric: "STEPS",
      targetValue: 3000,
      serverVerifiable: false,
      startDate: dayOf(daysAgo(2, 12)),
      endDate: today,
      rationale: null,
      video: null,
      participants: [
        {
          profileId: DEMO.kid,
          name: "서준",
          progress: 1,
          completed: false,
          verifiedBy: "SELF_REPORT",
          needsGuardianCheck: true,
          doneSessions: [],
        },
      ],
    },
  ] as unknown as MissionRow[];
}

/**
 * 승인·거절·미션 만들기는 **탭이 살아 있는 동안 남는다.**
 *
 * 전에는 모듈 상태로만 들고 있어서 새로고침 한 번에 방금 승인한 제안이
 * 승인 전으로 돌아갔다. 시연 중에 그러면 방금 한 일이 없던 일이 된다.
 * 칭찬과 같은 자리(탭 저장소)에 둔다 — 새 탭을 열면 처음부터다.
 */
function loadMissions(): MissionRow[] {
  try {
    const saved = sessionStorage.getItem(MISSION_KEY);
    if (saved) return perPerson(JSON.parse(saved) as MissionRow[]);
  } catch {
    return seedMissions();
  }
  return seedMissions();
}

/**
 * 칸에 끝냄을 하나만 두던 옛 저장분을 사람마다로 옮긴다 — 열어 둔 탭에서 방금 한 칸이
 * 안 한 칸으로 돌아가지 않게.
 */
function perPerson(missions: MissionRow[]): MissionRow[] {
  for (const m of missions) {
    const sessions = sessionsOfRow(m) as (SessionRow & { completed?: boolean })[];
    const done = sessions.filter((s) => s.completed).map((s) => s.position);
    for (const p of (m.participants ?? []) as ParticipantRow[]) {
      if (!Array.isArray(p.doneSessions)) p.doneSessions = done;
    }
    for (const s of sessions) delete s.completed;
  }
  return missions;
}

export function saveMissions() {
  try {
    sessionStorage.setItem(MISSION_KEY, JSON.stringify(db.missions));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

function loadCoachRun() {
  try {
    const saved = sessionStorage.getItem(RUN_KEY);
    if (saved) return JSON.parse(saved) as CoachRun;
  } catch {
    return structuredClone(fixtures.coachRun);
  }
  // 픽스처(실제 서버 응답)는 한 주 단위라 날짜가 박혀 있다. 코치가 처음 부를 때 오늘 제안으로 다시 단다(coach.ts)
  return structuredClone(fixtures.coachRun);
}

export function saveCoachRun() {
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify(db.coachRun));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

/**
 * 새로 만든 가족을 탭 저장소에서 되살린다.
 *
 * 안 그러면 새로고침 한 번에 방금 만든 가족이 서준이네로 되돌아간다 —
 * 가입하자마자 남의 집이 뜬다.
 */
function loadFamily<T>(key: "profiles" | "fitnessMap", fallback: T): T {
  try {
    const saved = sessionStorage.getItem(`${FAMILY_KEY}-${key}`);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    return structuredClone(fallback);
  }
  return structuredClone(fallback);
}

export function saveFamily() {
  try {
    sessionStorage.setItem(`${FAMILY_KEY}-profiles`, JSON.stringify(db.profiles));
    sessionStorage.setItem(`${FAMILY_KEY}-fitnessMap`, JSON.stringify(db.fitnessMap));
  } catch {
    // 저장이 안 돼도 이번 화면에서는 돈다
  }
}

export function saveCheers(cheers: CheerLog[]) {
  try {
    sessionStorage.setItem(CHEER_KEY, JSON.stringify(cheers));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}

export function setActingProfile(profileId: string) {
  db.actingProfileId = profileId;
  try {
    sessionStorage.setItem(ACTING_KEY, profileId);
  } catch {
    // 브라우저가 아니면 그냥 넘어간다
  }
}

export function acting(): Profile | undefined {
  return db.profiles.profiles.find((p) => p.profileId === db.actingProfileId);
}

/** 서버와 같은 봉투 모양으로 실패를 돌려준다 */
export function fail(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

export function uuid() {
  return crypto.randomUUID();
}

export function bandOf(percentile: number): Band {
  if (percentile >= 75) return "strength";
  if (percentile >= 25) return "steady";
  return "growth";
}

/** 쉬는 날 카드를 쓴 날 — 탭 저장소에서. 새로고침해도 방금 쓴 카드가 되돌아오지 않게 */
function loadRestDays(): string[] {
  try {
    const saved = sessionStorage.getItem(REST_KEY);
    if (saved) return JSON.parse(saved) as string[];
  } catch {
    return [];
  }
  return [];
}

export function saveRestDays() {
  try {
    sessionStorage.setItem(REST_KEY, JSON.stringify(db.restDays));
  } catch {
    // 저장이 안 돼도 화면은 돌아야 한다
  }
}
