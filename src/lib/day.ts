import type { DayLog, Mission, SessionPhase, VerifiedBy } from "./api/types";

/**
 * 하루 기록 한 장의 셈 — 큰 링 · 칸 셋 · 요약 줄 · 요일 줄의 작은 링이 같은 값을 쓴다.
 * 삼성헬스 「일일 활동」 처럼 링 셋이 그날을 말한다.
 *
 *   움직인 시간   그날 움직인 분 / 잡혀 있던 분
 *   끝낸 운동     끝낸 칸 / 전체 칸 — 칸이 없는 운동(직접 입력한 걷기 등)은 한 칸으로 센다
 *   칭찬          부모가 붙여 준 스티커 — 한 장이면 한 바퀴
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
        phases[s.phase] += s.minutes ?? 0;
      }
    } else {
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
 * 링 셋의 찬 정도(0~1). 목표를 넘겨도 한 바퀴에서 멈춘다 — 두 바퀴째를 그리면
 * 더 한 날이 덜 한 날보다 나은 날처럼 보인다. 잡힌 운동 없이 움직인 날은 한 바퀴다.
 */
export function dayRings(s: DaySummary): [number, number, number] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const time = s.planned ? s.moved / s.planned : s.moved > 0 ? 1 : 0;
  const work = s.total > 0 ? s.done / s.total : 0;
  return [clamp(time), clamp(work), s.stickers > 0 ? 1 : 0];
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
