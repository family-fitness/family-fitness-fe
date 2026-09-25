/**
 * 날짜별 기록 — `GET /families/{familyId}/calendar`.
 *
 * ▲ 서버에 아직 없다(`BACKEND_ASKS.md`). 목이 제안한 모양으로 답한다.
 *
 * 시연 가족의 지난 날들은 **날짜로 정해지는 값**으로 심는다. 새로고침할 때마다 달력이 바뀌면
 * 시연 중에 방금 본 칸이 사라진다. 그 위에 등록된 운동에서 한 것을 얹는다 — 아이가 방금 한 것이
 * 바로 비치고, 자정이 지나도 어제 한 것이 남는다.
 */
import { HttpResponse, http, type PathParams } from "msw";

import type {
  CalendarView,
  DayEntry,
  DayLog,
  MissionSession,
  SessionPhase,
  StickerLog,
  VerifiedBy,
} from "@/lib/api/types";
import { dayOf, daysBefore, today, weekdayCode } from "@/lib/today";

import {
  BASE,
  DEMO,
  DEMO_SCHEDULE,
  db,
  fail,
  participantOf,
  sessionsOfRow,
  type MissionRow,
} from "./db";

/**
 * 같은 글자에는 늘 같은 0~1. FNV-1a 에 마무리 섞기(MurmurHash3 fmix32)를 더했다.
 *
 * FNV-1a 만으로는 끝 글자만 다른 날짜들(`…-09-01`, `…-09-02`)이 거의 같은 값을 받아서,
 * 시연 가족이 보름을 내리 운동하다 열흘을 통째로 쉬는 달이 됐다. 섞어야 날마다 고르게 흩어진다.
 */
function roll(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 지난 기록에 쓰는 동작 이름. 국민체력100 유소년 처방에 나오는 것들 */
const MOVES: Record<SessionPhase, string[]> = {
  WARMUP: ["팔 벌려 뛰기", "어깨 돌리기", "제자리 걷기", "무릎 들어 올리기"],
  MAIN: ["스쿼트", "제자리 달리기", "앞뒤로 뛰기", "플랭크", "옆으로 뛰기", "버피 반만"],
  COOLDOWN: ["나비자세", "다리 뻗어 상체 숙이기", "고양이 자세", "숨 고르기"],
};

/** 시연 가족의 지난 기록이 있는 사람. 새로 만든 가족은 빈 달력에서 시작한다 */
export function hasHistory(profileId: string) {
  if (db.profiles.familyId !== DEMO.familyId) return false;
  return profileId === DEMO.kid || profileId === DEMO.mom;
}

/** 지난 하루. 쉰 날이면 null — 빈 날은 목록에 넣지 않는다 */
function pastDay(profileId: string, date: string): DayLog | null {
  const r = roll(`${profileId}:${date}`);
  // 아이는 운동할 수 있는 요일(월 · 수 · 금 · 토)에 주로 한다 — 리그는 잡힌 날로 센다.
  // 엄마는 아이보다 덜 한다. 응원만 하는 날이 많다. 요일은 처음 심은 시간표로 — 지금 시간표를
  // 고쳤다고 지난 기록이 바뀌지 않게
  const planned = (DEMO_SCHEDULE[profileId] ?? []).some((s) => s.day === weekdayCode(date));
  const rate = profileId === DEMO.kid ? (planned ? 0.84 : 0.4) : 0.38;
  // 아이는 어제 · 그제는 늘 했다. 시연을 여는 날 이번 주가 텅 비어 있으면
  // 이어서 하는 모습을 보여 줄 수 없다
  const recent = profileId === DEMO.kid && (date === daysBefore(1) || date === daysBefore(2));
  if (!recent && r > rate) return null;

  const pick = (phase: SessionPhase, k: number) => {
    const list = MOVES[phase];
    return list[Math.floor(roll(`${date}:${phase}:${k}`) * list.length)];
  };
  const mains = 1 + Math.floor(roll(`${date}:mains`) * 3);
  const plan: { title: string; phase: SessionPhase; minutes: number }[] = [
    { title: pick("WARMUP", 0), phase: "WARMUP", minutes: 1 },
    ...Array.from({ length: mains }, (_, k) => ({
      title: pick("MAIN", k),
      phase: "MAIN" as const,
      minutes: 2 + Math.floor(roll(`${date}:m${k}`) * 4),
    })),
    { title: pick("COOLDOWN", 0), phase: "COOLDOWN", minutes: 1 },
  ];
  const minutes = plan.reduce((sum, s) => sum + s.minutes, 0);
  const verifiedBy: VerifiedBy = roll(`${date}:vb`) < 0.15 ? "VIDEO_PROGRESS" : "TIMER";

  return {
    date,
    minutes,
    plannedMinutes: minutes,
    entries: [
      {
        missionId: `hist-${profileId.slice(-2)}-${date}`,
        title: `${plan[1].title} 중심 ${minutes}분`,
        minutes,
        verifiedBy,
        completed: true,
        sessions: plan.map((s) => ({ ...s, done: true })),
      },
    ],
    stickers: [],
  };
}

/** 여러 날에 걸친 운동인가 — 끝나는 날이 없으면 하루짜리다 */
const spans = (m: MissionRow) => (m.endDate ?? m.startDate) !== m.startDate;

/**
 * 그날 등록된 운동에서 한 것 — 오늘이든 지난날이든.
 * 여러 날짜리는 오늘(하는 중)과, 지난날이면 그날 끝낸 칸이 있는 날에만 선다 — 전에는 기간 안의 날마다
 * 같은 끝냄이 되풀이되어, 한 번 한 운동이 날마다 한 것이 되고 연속 · 나무 · 리그까지 부풀었다
 */
function liveDay(profileId: string, date: string): DayLog | null {
  const live = db.missions.filter((m) => {
    const me = participantOf(m, profileId);
    if (!me || date < (m.startDate ?? "") || date > (m.endDate ?? m.startDate ?? "")) return false;
    if (!spans(m) || date === today()) return true;
    return Object.values(me.doneOn ?? {}).includes(date);
  });
  if (live.length === 0) return null;

  const entries: DayEntry[] = live.map((m) => entryOf(m, profileId, date));
  const minutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const planned = live.reduce((sum, m) => sum + plannedOf(m), 0);
  return { date, minutes, plannedMinutes: planned || null, entries, stickers: [] };
}

function plannedOf(m: MissionRow): number {
  const sessions = sessionsOfRow(m);
  if (sessions.length > 0) return sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  return m.targetMetric === "TIMER_MINUTES" ? (m.targetValue ?? 0) : 0;
}

function entryOf(m: MissionRow, profileId: string, date: string): DayEntry {
  const me = participantOf(m, profileId);
  const sessions = sessionsOfRow(m);
  const planned = plannedOf(m);
  // 끝낸 칸은 사람마다다 — 형제가 같은 운동을 받아도 이 사람이 끝낸 칸만 센다.
  // 여러 날짜리는 그날 끝낸 칸만(끝낸 날을 모르는 옛 기록은 끝낸 칸 전부)
  const done = new Set(me?.doneSessions ?? []);
  const onDay = (s: MissionSession) =>
    !spans(m) || !me?.doneOn?.[s.position] || me.doneOn[s.position] === date;
  const isDone = (s: MissionSession) =>
    (Boolean(me?.completed) && !spans(m)) || (done.has(s.position) && onDay(s));
  // 칸이 있으면 끝낸 칸의 시간을 더하고, 없으면 진행률로 셈한다
  const minutes =
    sessions.length > 0
      ? sessions.filter(isDone).reduce((sum, s) => sum + (s.minutes ?? 0), 0)
      : Math.round((me?.progress ?? 0) * planned);
  return {
    missionId: m.missionId ?? "",
    title: m.title ?? "운동",
    minutes: m.targetMetric === "STEPS" ? 0 : minutes,
    verifiedBy: me?.verifiedBy ?? null,
    completed: Boolean(me?.completed),
    sessions:
      sessions.length > 0
        ? sessions.map((s) => ({
            title: s.title,
            phase: s.phase,
            minutes: s.minutes ?? null,
            done: isDone(s),
          }))
        : null,
  };
}

/**
 * 그날 한 운동 — 등록된 운동에서 한 것, 지난날이면 심어 둔 기록까지.
 * 레벨 · 연속 · 업적도 이 값으로 센다 — 달력과 레벨이 다른 날을 세면 안 된다.
 */
export function dayLogFor(profileId: string, date: string): DayLog | null {
  if (date > today()) return null;
  const live = liveDay(profileId, date);
  const past = date < today() && hasHistory(profileId) ? pastDay(profileId, date) : null;
  if (!past || !live) return past ?? live;
  return {
    date,
    minutes: past.minutes + live.minutes,
    plannedMinutes: (past.plannedMinutes ?? 0) + (live.plannedMinutes ?? 0) || null,
    entries: [...past.entries, ...live.entries],
    stickers: [],
  };
}

/** 그날 받은 스티커. 칭찬 목록에서 스티커가 붙은 것만 */
function stickersOn(profileId: string, date: string): StickerLog[] {
  return db.cheers
    .filter((c) => c.toProfileId === profileId && c.stickerId && dayOf(c.createdAt) === date)
    .map((c) => ({
      cheerId: c.cheerId,
      stickerId: c.stickerId ?? "",
      fromProfileId: c.fromProfileId,
      fromName: c.fromName,
      message: c.message,
      missionId: c.missionId,
      createdAt: c.createdAt,
    }));
}

/** from ~ to 의 날짜들. 두 달을 넘기면 자른다 — 한 번에 너무 많이 달라는 요청을 막는다 */
function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let back = 0; back < 70; back++) {
    const d = daysBefore(back, to);
    if (d < from) break;
    out.push(d);
  }
  return out.reverse();
}

export const history = [
  http.get<PathParams>(`${BASE}/families/:familyId/calendar`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const profileId = params.get("profileId");
    const from = params.get("from");
    const to = params.get("to");
    if (!profileId || !from || !to) {
      return fail(400, "BAD_REQUEST", "profileId · from · to 가 필요합니다");
    }

    const days = datesBetween(from, to)
      .map((date) => {
        const base = dayLogFor(profileId, date);
        const stickers = stickersOn(profileId, date);
        // 쉬는 날 카드를 쓴 날 — 가족 모두의 「쉬기로 한 날」. 빈 날이 아니다
        const rest = db.restDays.includes(date);
        if (!base && stickers.length === 0 && !rest) return null;
        return {
          ...(base ?? { date, minutes: 0, plannedMinutes: null, entries: [] }),
          stickers,
          ...(rest ? { rest: true } : {}),
        };
      })
      .filter((d): d is DayLog => d !== null);

    return HttpResponse.json<CalendarView>({ profileId, from, to, days });
  }),
];
