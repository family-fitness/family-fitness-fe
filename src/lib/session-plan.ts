import type { Mission, MissionSession, MissionWithSessions, SessionPhase } from "./api/types";

/**
 * 하루치 미션을 **세션 셋**으로 읽는 곳.
 *
 * 국민체력100 운동처방은 준비운동 · 본운동 · 정리운동으로 나뉘어 있다.
 * 영상도 한 편이 아니라 영상 **안의 구간**이다 — 12분짜리 한 편에 셋이 다 들어 있다.
 *
 * 계약에는 아직 `sessions` 도 `endSec` 도 없다(`BACKEND_ASKS.md`).
 * 그래서 여기서 **안 오면 지어내지 않는다** 를 지킨다.
 */

/** 화면에 적는 이름. 코드값을 그대로 내보내지 않는다 */
export const PHASE_LABEL: Record<SessionPhase, string> = {
  WARMUP: "준비운동",
  MAIN: "본운동",
  COOLDOWN: "정리운동",
};

/** 하는 차례. 서버가 position 을 안 주거나 뒤섞여 와도 이 순서로 세운다 */
const PHASE_ORDER: Record<SessionPhase, number> = { WARMUP: 0, MAIN: 1, COOLDOWN: 2 };

/**
 * 미션에서 세션 목록을 읽는다.
 *
 * **세션이 안 오면 본운동 한 칸만 만든다.** 준비·정리를 프론트가 지어내면
 * 코치가 짜지 않은 운동을 아이에게 시키는 게 된다.
 */
export function sessionsOf(mission: MissionWithSessions | Mission | undefined): MissionSession[] {
  if (!mission) return [];
  const given = (mission as MissionWithSessions).sessions;
  if (given && given.length > 0) return orderSessions(given);

  /* 세션이 없는 미션도 하나는 해야 한다. 미션 자체를 본운동 한 칸으로 본다 */
  const me = mission.participants?.[0];
  return [
    {
      position: 1,
      phase: "MAIN",
      title: mission.title ?? "오늘의 운동",
      minutes: mission.targetMetric === "TIMER_MINUTES" ? mission.targetValue : null,
      clip: mission.video
        ? {
            videoId: mission.video.videoId ?? "",
            startSec: mission.video.startSec,
            endSec: null,
            title: mission.video.title,
            url: mission.video.url,
          }
        : null,
      completed: me?.completed ?? false,
      verifiedBy: me?.verifiedBy ?? null,
    },
  ];
}

/** 준비 → 본 → 정리, 같은 단계 안에서는 받은 차례대로 */
export function orderSessions(given: MissionSession[] | null | undefined): MissionSession[] {
  return [...(given ?? [])].sort(
    (a, b) =>
      (PHASE_ORDER[a.phase] ?? 9) - (PHASE_ORDER[b.phase] ?? 9) ||
      (a.position ?? 0) - (b.position ?? 0),
  );
}

/** 0:12 처럼 */
export function clock(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec)) return "";
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 세션들의 시간을 합친다. 화면 제목에 쓰는 값 */
export function totalMinutes(sessions: MissionSession[]): number {
  return sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
}
