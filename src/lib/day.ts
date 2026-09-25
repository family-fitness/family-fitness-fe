import type { DayLog, Mission, MissionSession, SessionPhase, VerifiedBy } from "./api/types";
import { sessionsOf, stepMinutes } from "./session-plan";

/**
 * 하루 기록 한 장의 셈 — 큰 링 · 칸 · 요약 줄 · 요일 줄의 작은 링이 같은 값을 쓴다.
 * 삼성헬스 「일일 활동」 처럼 링이 그날을 말한다.
 *
 *   움직인 시간   그날 움직인 분 / 잡혀 있던 분
 *   끝낸 운동     끝낸 칸 / 전체 칸 — 칸이 없는 운동은 한 칸으로 센다.
 *                 **직접 입력한 것(걸음수)은 세지 않는다** — 홈의 링과 같다(규칙 2)
 *
 * 칭찬은 링으로 그리지 않는다. 아이가 스스로 채울 수 없는 고리가 비어 있으면 못 채운 날이 된다(규칙 12).
 */
export interface DaySummary {
  moved: number;
  /** 잡혀 있던 분. 등록한 운동이 없던 날은 null */
  planned: number | null;
  done: number;
  total: number;
  stickers: number;
  /** 끝낸 칸의 분 — 준비 · 본 · 정리마다 */
  phases: Record<SessionPhase, number>;
  /** 무엇으로 확인했는지. 한 번씩만 */
  verified: VerifiedBy[];
}

export function daySummary(log: DayLog | null | undefined): DaySummary {
  const phases: Record<SessionPhase, number> = { WARMUP: 0, MAIN: 0, COOLDOWN: 0 };
  const verified: VerifiedBy[] = [];
  let done = 0;
  let total = 0;
  for (const entry of log?.entries ?? []) {
    if (entry.sessions && entry.sessions.length > 0) {
      for (const s of entry.sessions) {
        total += 1;
        if (!s.done) continue;
        done += 1;
        phases[s.phase] += stepMinutes(s);
      }
    } else if (entry.verifiedBy !== "SELF_REPORT") {
      total += 1;
      if (entry.completed) done += 1;
    }
    if (entry.verifiedBy && !verified.includes(entry.verifiedBy)) verified.push(entry.verifiedBy);
  }
  return {
    moved: log?.minutes ?? 0,
    planned: log?.plannedMinutes ?? null,
    done,
    total,
    stickers: log?.stickers.length ?? 0,
    phases,
    verified,
  };
}

/**
 * 링 둘의 찬 정도(0~1) — 움직인 시간 · 끝낸 운동. 목표를 넘겨도 한 바퀴에서 멈춘다 —
 * 두 바퀴째를 그리면 더 한 날이 덜 한 날보다 나은 날처럼 보인다. 잡힌 운동 없이 움직인 날은 한 바퀴다.
 */
export function dayRings(s: DaySummary): [number, number] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const time = s.planned ? s.moved / s.planned : s.moved > 0 ? 1 : 0;
  const work = s.total > 0 ? s.done / s.total : 0;
  return [clamp(time), clamp(work)];
}

/**
 * 그날 한 것으로 보일 운동 — 한 칸이라도 끝냈거나, 움직인 분이 있거나, 직접 적어 낸 것.
 * 아직 시작 안 한 것은 「할 운동」 이다. 움직인 분은 셌는데 목록에서 빠지면 숫자와 목록이 어긋난다
 */
export function didSomething(entry: DayLog["entries"][number]): boolean {
  return (
    entry.completed ||
    entry.minutes > 0 ||
    entry.verifiedBy === "SELF_REPORT" ||
    Boolean(entry.sessions?.some((s) => s.done))
  );
}

/**
 * 주소창의 날짜가 달력에 있는 날인가 — `2026-13-01` · `2026-02-30` 을 거르고,
 * 이 서비스가 다룰 해(2020~2100)만 받는다. 1000년 같은 값은 앞뒤 날을 셀 때 끝없이 돈다
 */
export function isRealDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 2020 || year > 2100) return false;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const back = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return back === value;
}

/**
 * 잡아 둔 운동이 캘린더의 어느 날에 서는지. 하루짜리가 대부분이다 —
 * 기간이 긴 운동은 첫날, 이미 시작했으면 오늘에 선다. 끝난 기간이면 null.
 * 걸음수는 넣지 않는다(규칙 2 — 잡아 둔 운동이 아니라 스스로 적는 값이다).
 */
export function plannedDay(mission: Mission, now: string): string | null {
  if (mission.targetMetric === "STEPS") return null;
  const start = mission.startDate ?? "";
  const end = mission.endDate ?? start;
  return start > now ? start : end >= now ? now : null;
}

/** 이 아이가 그날 할 운동 */
export function plannedOn(
  missions: Mission[],
  profileId: string | undefined,
  date: string,
  now: string,
): Mission[] {
  return missions.filter(
    (m) => m.participants?.some((p) => p.profileId === profileId) && plannedDay(m, now) === date,
  );
}

/**
 * 그날 이 사람이 하는 운동 — 기간 안에 그날이 드는 것. 끝나는 날이 없으면 하루짜리다(`plannedDay` 와 같다).
 */
export function missionsOn(
  missions: Mission[] | undefined,
  profileId: string | null | undefined,
  date: string,
): Mission[] {
  return (missions ?? []).filter((m) => {
    const start = m.startDate ?? "";
    const end = m.endDate ?? start;
    return start <= date && date <= end && m.participants?.some((p) => p.profileId === profileId);
  });
}

/**
 * 한 사람의 그날 운동 — 걸음수(직접 적는 값)는 뺀다(규칙 2). 부모 홈 줄 · 아이 기록 · 가족 대시보드 ·
 * 아이 홈이 이 하나로 센다 — 같은 아이의 오늘을 화면마다 다르게 말하면 안 된다.
 */
export interface DayWork {
  missions: Mission[];
  /** 그 사람의 칸. 끝냈는지는 그 사람 것으로(`sessionsOf`) */
  sessions: MissionSession[];
  done: number;
  total: number;
}

export function dayWork(
  missions: Mission[] | undefined,
  profileId: string | null | undefined,
  date: string,
): DayWork {
  const mine = missionsOn(missions, profileId, date).filter((m) => m.targetMetric !== "STEPS");
  const sessions = mine.flatMap((m) => sessionsOf(m, profileId));
  return {
    missions: mine,
    sessions,
    done: sessions.filter((s) => s.completed).length,
    total: sessions.length,
  };
}

/** 오늘 한마디 — 한 만큼이 먼저다. 쉬는 날에 「그래도 할래요」 로 한 것을 「쉬는 날」 로 덮지 않는다 */
export function todayLine(work: DayWork, rest: boolean): string {
  if (work.total > 0 && work.done === work.total) return "오늘 다 했어요";
  if (work.done > 0) return `오늘 ${work.done} / ${work.total}개`;
  if (rest) return "오늘 쉬는 날";
  return work.missions.length > 0 ? "오늘 운동 있어요" : "오늘 운동 없어요";
}
