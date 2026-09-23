/**
 * 레벨 · 경험치 · 업적 — `GET /profiles/{profileId}/progress`.
 *
 * ▲ 서버에 아직 없다(`BACKEND_ASKS.md`). 회의에서 계산은 서버가 하기로 했고,
 * 목은 서버에 제안할 규칙대로 날짜별 기록에서 센다. 달력과 같은 기록을 세야
 * 달력에서 본 날과 레벨이 어긋나지 않는다.
 *
 * | 무엇                     | 경험치 |
 * | ------------------------ | ------ |
 * | 운동 한 칸 끝내기        | +5     |
 * | 그날 잡힌 것 다 하기     | +20    |
 * | 칭찬 스티커 받기         | +10    |
 * | 키 · 몸무게 새로 재기    | +20    |
 *
 * 경험치는 **줄지 않는다.** 쉰 날에 깎는 규칙은 없다.
 */
import { HttpResponse, http, type PathParams } from "msw";

import type { AchievementView, DayLog, ProgressView, XpEvent } from "@/lib/api/types";
import { callName } from "@/lib/family";
import { daysBefore, today } from "@/lib/today";
import { josa } from "@/lib/utils";

import { BASE, DEMO, db, type Profile } from "./db";
import { dayLogFor } from "./history";

export const XP = { SESSION: 5, DAY_DONE: 20, STICKER: 10, MEASURE: 20 } as const;

/** 레벨 n 이 시작되는 경험치. 뒤로 갈수록 한 레벨이 길어진다 */
export const LEVEL_FLOOR = [0, 80, 200, 360, 560, 800, 1080, 1400, 1760, 2160] as const;

/** 경험치를 셀 날들. 목의 기록은 지난 3주까지다 */
const WINDOW = 21;

/**
 * 시연 — 서준이는 오늘 운동을 다 하면 레벨이 오를 만큼(30 모자란 채로) 서 있다.
 * 레벨이 오르는 순간(섬에 새 장식이 튀어나오고 「새로 열렸어요」)을 시연에서 볼 수 있게. 목에만 있다
 */
const DEMO_SHORT = 30;

function levelOf(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_FLOOR.length; i++) if (xp >= LEVEL_FLOOR[i]) level = i + 1;
  return level;
}

function dayXp(log: DayLog): number {
  const sessions = log.entries.flatMap((e) => e.sessions ?? []);
  const done = sessions.filter((s) => s.done).length;
  const allDone = log.entries.length > 0 && log.entries.every((e) => e.completed);
  return done * XP.SESSION + (allDone ? XP.DAY_DONE : 0);
}

/** 오늘부터 거꾸로, 움직인 날이 며칠 이어지나. 오늘 아직이면 어제부터 센다 */
function streakOf(active: Set<string>): number {
  const start = active.has(today()) ? 0 : 1;
  let n = 0;
  while (active.has(daysBefore(start + n))) n += 1;
  return n;
}

export function progressOf(profileId: string): ProgressView {
  const dates = Array.from({ length: WINDOW }, (_, i) => daysBefore(WINDOW - 1 - i));
  const logs = dates
    .map((d) => dayLogFor(profileId, d))
    .filter((l): l is DayLog => l !== null && l.minutes > 0);
  const active = new Set(logs.map((l) => l.date));
  const tests = db.tests[profileId] ?? [];
  const stickers = db.cheers.filter((c) => c.toProfileId === profileId && c.stickerId);
  // 이 경험치 줄은 그 사람이 읽는다. 아이에게 부모는 엄마 · 아빠다
  const people = db.profiles.profiles ?? [];
  const forKid = people.find((p) => p.profileId === profileId)?.role === "CHILD";
  const fromOf = (id: string, fallback: string) =>
    callName(people.find((p) => p.profileId === id) as Profile | undefined, fallback, forKid);

  const events: XpEvent[] = [
    ...logs.map((l) => ({
      reason: l.entries.every((e) => e.completed) ? "운동을 다 했어요" : "운동을 했어요",
      amount: dayXp(l),
      // 오늘 것은 지금 시각. 저녁 7시로 적으면 낮에 열었을 때 아직 오지 않은 시각이 된다
      at: l.date === today() ? new Date().toISOString() : `${l.date}T19:00:00+09:00`,
    })),
    ...stickers.map((c) => ({
      reason: `${fromOf(c.fromProfileId, c.fromName)}${josa(fromOf(c.fromProfileId, c.fromName), "이가")} 붙여 준 스티커`,
      amount: XP.STICKER,
      at: c.createdAt,
    })),
    ...tests.slice(0, -1).map((t) => ({
      reason: "키 · 몸무게를 새로 쟀어요",
      amount: XP.MEASURE,
      at: `${t.testedOn}T10:00:00+09:00`,
    })),
  ].filter((e) => e.amount > 0);

  // 목의 기록은 지난 3주뿐이라 그 전에 한 운동이 경험치에서 빠진다. 시연 가족의 아이는 그 몫을 한 줄로
  // 더해, 오늘 것을 빼고 셌을 때 Lv.6(연못) 이상 다음 레벨에 딱 30 모자라게 선다
  if (profileId === DEMO.kid && db.profiles.familyId === DEMO.familyId) {
    const todayXp = logs.filter((l) => l.date === today()).reduce((sum, l) => sum + dayXp(l), 0);
    const base = events.reduce((sum, e) => sum + e.amount, 0) - todayXp;
    const next = LEVEL_FLOOR.find((floor) => floor >= LEVEL_FLOOR[5] && floor - DEMO_SHORT >= base);
    if (next !== undefined && next - DEMO_SHORT > base) {
      events.push({
        reason: "3주 전까지 한 운동",
        amount: next - DEMO_SHORT - base,
        at: `${daysBefore(WINDOW + 1)}T19:00:00+09:00`,
      });
    }
  }

  const xp = events.reduce((sum, e) => sum + e.amount, 0);
  const level = levelOf(xp);

  return {
    profileId,
    level,
    xp,
    levelFloorXp: LEVEL_FLOOR[level - 1],
    nextLevelXp: level < LEVEL_FLOOR.length ? LEVEL_FLOOR[level] : null,
    streakDays: streakOf(active),
    activeDays: active.size,
    achievements: achievementsOf(
      profileId,
      logs,
      tests.length,
      stickers.map((c) => c.createdAt),
    ),
    // 시각이 「Z」 와 「+09:00」 으로 섞여 온다 — 글자가 아니라 시각으로 줄 세운다
    recentXp: events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5),
  };
}

/**
 * 업적. 이름과 얻는 법은 서버가 정한다 — 화면은 그대로 쓴다.
 *
 * **개수를 목표로 하는 칭찬 업적은 없다.** 「스티커 10장」 을 두면 못 채운 날이
 * 실패가 된다(규칙 12). 첫 스티커 하나만 기념한다.
 */
function achievementsOf(
  profileId: string,
  logs: DayLog[],
  testCount: number,
  stickerTimes: string[],
): AchievementView[] {
  const at = (date: string | undefined) => (date ? `${date}T19:00:00+09:00` : null);
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  // 합친 분이 처음 n 을 넘은 날
  const minutesReached = (n: number) => {
    let sum = 0;
    for (const l of sorted) {
      sum += l.minutes;
      if (sum >= n) return l.date;
    }
    return undefined;
  };
  // 이어서 n 일이 처음 된 날
  const streakReached = (n: number) => {
    let run = 0;
    let prev: string | null = null;
    for (const l of sorted) {
      run = prev && daysBefore(1, l.date) === prev ? run + 1 : 1;
      prev = l.date;
      if (run >= n) return l.date;
    }
    return undefined;
  };
  const fullSet = sorted.find((l) => {
    const phases = new Set(
      l.entries.flatMap((e) => (e.sessions ?? []).filter((s) => s.done).map((s) => s.phase)),
    );
    return phases.has("WARMUP") && phases.has("MAIN") && phases.has("COOLDOWN");
  })?.date;
  const weekend = sorted.find((l) =>
    [0, 6].includes(new Date(`${l.date}T00:00:00`).getDay()),
  )?.date;
  const others = db.profiles.profiles
    .filter((p) => p.profileId !== profileId && p.role === "PARENT")
    .map((p) => p.profileId ?? "");
  const together = sorted.find((l) =>
    others.some((o) => (dayLogFor(o, l.date)?.minutes ?? 0) > 0),
  )?.date;

  return [
    {
      code: "FIRST_STEP",
      title: "첫걸음",
      description: "운동 한 칸을 처음 끝내요",
      earnedAt: at(sorted[0]?.date),
    },
    {
      code: "STREAK_3",
      title: "사흘 이어서",
      description: "3일 이어서 움직여요",
      earnedAt: at(streakReached(3)),
    },
    {
      code: "FULL_SET",
      title: "준비부터 정리까지",
      description: "준비 · 본 · 정리를 한 번에 다 해요",
      earnedAt: at(fullSet),
    },
    {
      code: "MIN_30",
      title: "30분",
      description: "모두 합쳐 30분 움직여요",
      earnedAt: at(minutesReached(30)),
    },
    {
      code: "MIN_100",
      title: "100분",
      description: "모두 합쳐 100분 움직여요",
      earnedAt: at(minutesReached(100)),
    },
    {
      code: "WEEKEND",
      title: "주말에도",
      description: "토요일이나 일요일에 운동해요",
      earnedAt: at(weekend),
    },
    {
      code: "TOGETHER",
      title: "가족과 함께",
      description: "엄마 · 아빠와 같은 날 운동해요",
      earnedAt: at(together),
    },
    {
      code: "STREAK_7",
      title: "일주일 이어서",
      description: "7일 이어서 움직여요",
      earnedAt: at(streakReached(7)),
    },
    {
      code: "REMEASURE",
      title: "자란 만큼 다시",
      description: "키 · 몸무게를 새로 재요",
      earnedAt: testCount >= 2 ? at(today()) : null,
    },
    {
      code: "FIRST_STICKER",
      title: "첫 스티커",
      description: "칭찬 스티커를 처음 받아요",
      earnedAt: stickerTimes.sort()[0] ?? null,
    },
    {
      code: "MIN_300",
      title: "300분",
      description: "모두 합쳐 300분 움직여요",
      earnedAt: at(minutesReached(300)),
    },
    {
      code: "SIX_POWERS",
      title: "여섯 가지 힘",
      description: "여섯 가지 힘을 기르는 운동을 다 해 봐요",
      earnedAt: null,
    },
  ];
}

export const progress = [
  http.get<PathParams>(`${BASE}/profiles/:profileId/progress`, ({ params }) =>
    HttpResponse.json<ProgressView>(progressOf(String(params.profileId))),
  ),
];
