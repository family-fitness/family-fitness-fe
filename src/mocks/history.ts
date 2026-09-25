/**
 * 날짜별 기록 — `GET /families/{familyId}/calendar`.
 *
 * ▲ 서버에 아직 없다(`BACKEND_ASKS.md`). 목이 제안한 모양으로 답한다.
 *
 * 지난 날들은 **날짜로 정해지는 값**으로 심는다. 새로고침할 때마다 달력이 바뀌면
 * 시연 중에 방금 본 칸이 사라진다. 오늘 칸만 지금 미션 진행에서 계산한다 —
 * 아이가 방금 한 것이 바로 비쳐야 하기 때문이다.
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

import { BASE, DEMO, db, fail, type MissionRow } from "./db";

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
  // 엄마는 아이보다 덜 한다. 응원만 하는 날이 많다
  const planned = (db.availability[profileId] ?? []).some((s) => s.day === weekdayCode(date));
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

/** 오늘 칸 — 지금 돌아가는 미션에서 계산한다 */
function todayOf(profileId: string, date: string): DayLog | null {
  const live = db.missions.filter(
    (m) =>
      (m.startDate ?? "") <= date &&
      date <= (m.endDate ?? "") &&
      (m.participants ?? []).some((p) => p.profileId === profileId),
  );
  if (live.length === 0) return null;

  const entries: DayEntry[] = live.map((m) => entryOf(m, profileId));
  const minutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const planned = live.reduce((sum, m) => sum + plannedOf(m), 0);
  return { date, minutes, plannedMinutes: planned || null, entries, stickers: [] };
}

function sessionsOfRow(m: MissionRow): MissionSession[] {
  return ((m as unknown as { sessions?: MissionSession[] }).sessions ?? []).slice();
}

function plannedOf(m: MissionRow): number {
  const sessions = sessionsOfRow(m);
  if (sessions.length > 0) return sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  return m.targetMetric === "TIMER_MINUTES" ? (m.targetValue ?? 0) : 0;
}

function entryOf(m: MissionRow, profileId: string): DayEntry {
  const me = (m.participants ?? []).find((p) => p.profileId === profileId);
  const sessions = sessionsOfRow(m);
  const planned = plannedOf(m);
  // 칸이 있으면 끝낸 칸의 시간을 더하고, 없으면 진행률로 셈한다
  const minutes =
    sessions.length > 0
      ? sessions.filter((s) => s.completed).reduce((sum, s) => sum + (s.minutes ?? 0), 0)
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
            done: Boolean(s.completed),
          }))
        : null,
  };
}

/**
 * 그날 한 운동. 오늘이면 지금 미션에서, 지난날이면 심어 둔 기록에서.
 * 레벨 · 연속 · 업적도 이 값으로 센다 — 달력과 레벨이 다른 날을 세면 안 된다.
 */
export function dayLogFor(profileId: string, date: string): DayLog | null {
  if (date > today()) return null;
  if (date === today()) return todayOf(profileId, date);
  return hasHistory(profileId) ? pastDay(profileId, date) : null;
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
