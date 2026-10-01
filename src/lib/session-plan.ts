import type {
  Mission,
  MissionParticipant,
  MissionSession,
  MissionWithSessions,
  ProposalWithSessions,
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
      ...wholeAsMain(mission),
      completed: me?.completed ?? false,
      verifiedBy: me?.verifiedBy ?? null,
    },
  ];
}

/**
 * 제안의 칸. 칸이 안 오면 미션처럼 본운동 한 칸으로 본다 — 등록하면 같은 운동이 아이 화면에
 * 본운동 한 칸으로 뜬다. 제안에서만 「0개 · 0분」 이면 같은 운동을 두 화면이 다르게 말한다.
 */
export function proposalSessions(proposal: ProposalWithSessions | undefined): MissionSession[] {
  if (!proposal) return [];
  const given = proposal.sessions;
  return given && given.length > 0 ? orderSessions(given) : [wholeAsMain(proposal)];
}

/** 칸이 안 온 운동(미션 · 제안) 전체를 본운동 한 칸으로. 준비 · 정리는 지어내지 않는다 */
function wholeAsMain(source: {
  title?: string | null;
  targetMetric?: string | null;
  targetValue?: number | null;
  video?: {
    videoId?: string | null;
    startSec?: number | null;
    title?: string | null;
    url?: string | null;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
}): MissionSession {
  return {
    position: 1,
    phase: "MAIN",
    title: source.title ?? "오늘의 운동",
    minutes: source.targetMetric === "TIMER_MINUTES" ? (source.targetValue ?? null) : null,
    clip: source.video
      ? {
          videoId: source.video.videoId ?? "",
          startSec: source.video.startSec,
          endSec: null,
          title: source.video.title,
          url: source.video.url,
          mediaUrl: source.video.mediaUrl,
          thumbnailUrl: source.video.thumbnailUrl,
        }
      : null,
  };
}

/**
 * 하는 차례 — 받은 `position` 그대로. 직접 만들기에서 부모가 정한 차례가 곧 하는 차례다(`routine.ts`) —
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

/** 칸 영상 구간의 길이(초). 구간 끝을 모르면 null */
export function clipSeconds(
  clip: { startSec?: number | null; endSec?: number | null } | null | undefined,
): number | null {
  if (clip?.endSec == null) return null;
  const len = clip.endSec - (clip.startSec ?? 0);
  return Number.isFinite(len) && len > 0 ? Math.round(len) : null;
}

/**
 * 서버가 인정하는 가장 짧은 운동 시간(초). 서버의 기준 시간은 그 동작에 잡힌 운동 시간(분) × 60 이고,
 * 영상 구간(끝 초)이 있으면 그 시간과 구간 길이 중 짧은 쪽이다. 기준 시간의 절반보다 짧으면
 * 422 TOO_SHORT 를 준다(BE `SessionCompletionService.creditedSeconds`)
 */
export function minCreditSeconds(s: {
  minutes?: number | null;
  clip?: VideoClipRange | null;
}): number {
  const planned = stepMinutes(s) * 60;
  return Math.ceil(Math.min(planned, clipSeconds(s.clip) ?? planned) / 2);
}

/**
 * 한 동작의 타이머(초). 영상 길이를 알면 영상 길이(구간 끝, 그다음 플레이어가 알려 준 길이),
 * 모르면 그 동작에 잡힌 운동 시간(분). 서버 하한보다 짧게 잡지 않는다
 */
export function stepSeconds(
  s: { minutes?: number | null; clip?: VideoClipRange | null },
  measured?: number | null,
): number {
  const video = clipSeconds(s.clip) ?? (measured && measured > 0 ? Math.round(measured) : null);
  return Math.max(video ?? stepMinutes(s) * 60, minCreditSeconds(s));
}

/** 이만큼 하면 그 칸을 끝낸 것으로 친다 — 타이머의 절반. 서버 하한보다 짧지 않게 */
export function doneAtSeconds(
  s: { minutes?: number | null; clip?: VideoClipRange | null },
  measured?: number | null,
): number {
  return Math.max(Math.ceil(stepSeconds(s, measured) / 2), minCreditSeconds(s));
}

type VideoClipRange = { startSec?: number | null; endSec?: number | null };

/** 세션들의 시간을 합친다. 화면 제목에 쓰는 값 */
export function totalMinutes(sessions: { minutes?: number | null }[]): number {
  return sessions.reduce((sum, s) => sum + stepMinutes(s), 0);
}
