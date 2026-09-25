import type { ClipView, MissionSession, SessionPhase } from "./api/types";
import { daysBefore } from "./today";

/**
 * 직접 짜기 — 부모가 고른 동작으로 운동을 만든다. 순수 셈만 여기에.
 *
 * AI 편성과 다른 길이다(9/23 "선택해서 미션을 생성"). 부모가 고른 것이라 제안을 거치지 않고
 * 바로 그날의 운동이 된다. 여러 날 · 여러 주에 한 번에 넣을 수 있다(삼성헬스 프로그램처럼).
 */

export interface RoutineMove {
  clip: ClipView;
  /** 이 동작에 잡을 시간(분) */
  minutes: number;
}

/** 한 루틴에 담는 동작 수 — 열 개가 넘으면 짜증난다(회의) */
export const MAX_MOVES = 10;
export const MOVE_MINUTES = { min: 1, max: 5 } as const;
/** 몇 주까지 되풀이하나 */
const MAX_WEEKS = 4;

const PHASE_ORDER: SessionPhase[] = ["WARMUP", "MAIN", "COOLDOWN"];

/** 처음 담을 때 시간 — 준비 · 정리는 1분, 본운동은 3분 */
function defaultMinutes(phase: SessionPhase): number {
  return phase === "MAIN" ? 3 : 1;
}

/** 담기 — 이미 있으면 빼고, 없으면 끝에 붙인다. 열 개까지 */
export function toggleMove(moves: RoutineMove[], clip: ClipView): RoutineMove[] {
  if (moves.some((m) => m.clip.clipId === clip.clipId)) {
    return moves.filter((m) => m.clip.clipId !== clip.clipId);
  }
  if (moves.length >= MAX_MOVES) return moves;
  return [...moves, { clip, minutes: defaultMinutes(clip.phase) }];
}

/** 준비 → 본 → 정리 차례로 세운다. 같은 단계 안에서는 담은 차례 그대로 */
export function tidy(moves: RoutineMove[]): RoutineMove[] {
  return moves
    .map((m, i) => ({ m, i }))
    .sort(
      (a, b) =>
        PHASE_ORDER.indexOf(a.m.clip.phase) - PHASE_ORDER.indexOf(b.m.clip.phase) || a.i - b.i,
    )
    .map(({ m }) => m);
}

/** 한 칸 위 · 아래로. 끝에서는 그대로 */
export function shift(moves: RoutineMove[], index: number, by: -1 | 1): RoutineMove[] {
  const to = index + by;
  if (index < 0 || index >= moves.length || to < 0 || to >= moves.length) return moves;
  const next = [...moves];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** 시간 바꾸기 — 1~5분 사이로 */
export function setMinutes(moves: RoutineMove[], index: number, minutes: number): RoutineMove[] {
  const clamped = Math.min(MOVE_MINUTES.max, Math.max(MOVE_MINUTES.min, Math.round(minutes)));
  return moves.map((m, i) => (i === index ? { ...m, minutes: clamped } : m));
}

export function routineMinutes(moves: RoutineMove[]): number {
  return moves.reduce((sum, m) => sum + m.minutes, 0);
}

/** 서버에 보낼 칸들. 담은(세운) 차례가 곧 하는 차례다 */
export function toSessions(moves: RoutineMove[]): MissionSession[] {
  return moves.map((m, i) => ({
    position: i + 1,
    phase: m.clip.phase,
    title: m.clip.title,
    factor: m.clip.factor,
    minutes: m.minutes,
    clip: {
      videoId: m.clip.videoId,
      startSec: m.clip.startSec,
      endSec: m.clip.endSec,
      title: m.clip.title,
    },
    completed: false,
    verifiedBy: null,
  }));
}

/** 오늘부터 며칠 — 고를 수 있는 날 */
export function upcomingDays(from: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => daysBefore(-i, from));
}

/** 고른 날들을 몇 주 되풀이한다 — 같은 요일에 한 주씩 뒤로. 날짜 차례로, 겹치지 않게 */
export function repeatDates(days: string[], weeks: number): string[] {
  const n = Math.min(MAX_WEEKS, Math.max(1, Math.round(weeks)));
  const all = days.flatMap((d) => Array.from({ length: n }, (_, w) => daysBefore(-7 * w, d)));
  return [...new Set(all)].sort();
}

/** 제목 — 본운동 첫 동작으로. 본운동이 없으면 첫 동작 */
export function routineTitle(moves: RoutineMove[]): string {
  const main = moves.find((m) => m.clip.phase === "MAIN") ?? moves[0];
  if (!main) return "직접 짠 운동";
  const more = moves.length - 1;
  return more > 0 ? `${main.clip.title} 외 ${more}개` : main.clip.title;
}
