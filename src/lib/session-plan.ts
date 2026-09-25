import type {
  Mission,
  MissionParticipant,
  MissionSession,
  MissionWithSessions,
  SessionPhase,
} from "./api/types";

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

/** 차례를 모를 때(position 이 없을 때)만 쓰는 순서 */
const PHASE_ORDER: Record<SessionPhase, number> = { WARMUP: 0, MAIN: 1, COOLDOWN: 2 };

/**
 * 미션에서 **한 사람의** 세션 목록을 읽는다. 끝냈는지는 그 사람의 기록(`doneSessions`)으로 채운다 —
 * 형제가 같은 운동을 받았을 때 한 아이가 끝낸 칸이 다른 아이에게 끝난 칸으로 보이면 안 된다.
 * 참여자가 아닌 사람이면 끝낸 칸이 없다.
 *
 * **세션이 안 오면 본운동 한 칸만 만든다.** 준비·정리를 프론트가 지어내면
 * 코치가 짜지 않은 운동을 아이에게 시키는 게 된다.
 */
export function sessionsOf(
  mission: MissionWithSessions | Mission | undefined,
  profileId: string | null | undefined,
): MissionSession[] {
  if (!mission) return [];
  const me = mission.participants?.find((p) => p.profileId === profileId) as
    MissionParticipant | undefined;
  const given = (mission as MissionWithSessions).sessions;
  if (given && given.length > 0) {
    /*
      사람마다의 기록(doneSessions)이 오면 그것만 믿는다. 서버가 아직 싣지 않으면(▲ 요청) 칸의 completed 로 물러선다 —
      안 그러면 한 칸 끝내고 다시 받을 때마다 끝낸 칸이 사라져 아이가 첫 칸부터 다시 했다.
      참여자가 아니면 끝낸 칸이 없다
    */
    const done = me ? (me.doneSessions != null ? new Set(me.doneSessions) : null) : new Set();
    return orderSessions(given).map((s) => {
      const completed =
        Boolean(me?.completed) || (done ? done.has(s.position) : Boolean(s.completed));
      return { ...s, completed, verifiedBy: completed ? (me?.verifiedBy ?? null) : null };
    });
  }

  /* 세션이 없는 미션도 하나는 해야 한다. 미션 자체를 본운동 한 칸으로 본다 */
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

/**
 * 하는 차례 — 받은 `position` 그대로. 직접 짜기에서 부모가 정한 차례가 곧 하는 차례다(`routine.ts`) —
 * 준비 · 본 · 정리로 다시 줄 세우면 부모가 짠 순서와 아이가 하는 순서가 달라진다.
 * 차례가 없는 칸만 준비 → 본 → 정리로 뒤에 선다.
 */
export function orderSessions(given: MissionSession[] | null | undefined): MissionSession[] {
  const rank = (s: MissionSession) =>
    Number.isFinite(s.position) ? s.position : 1000 + (PHASE_ORDER[s.phase] ?? 9);
  return [...(given ?? [])].sort((a, b) => rank(a) - rank(b));
}

/** 0:12 처럼 */
export function clock(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec)) return "";
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * 한 칸의 시간(분). 시간이 없거나 0으로 온 칸은 1분 — 운동하기의 타이머가 그만큼 돈다.
 * 칸 줄 · 묶음 합 · 제목의 합이 다 이 셈이다. 전에는 제목만 0분으로 세어 칸 합과 어긋났다
 */
export function stepMinutes(s: { minutes?: number | null }): number {
  return Math.max(1, s.minutes ?? 1);
}

/** 세션들의 시간을 합친다. 화면 제목에 쓰는 값 */
export function totalMinutes(sessions: { minutes?: number | null }[]): number {
  return sessions.reduce((sum, s) => sum + stepMinutes(s), 0);
}
