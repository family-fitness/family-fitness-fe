import type { Mission, VerifiedBy } from "./api/types";
import { sessionsOf } from "./session-plan";

/** 무엇으로 확인됐는지. */
export const VERIFIED_COPY: Record<VerifiedBy, string> = {
  VIDEO_PROGRESS: "영상 보며 따라 했어요",
  TIMER: "타이머로 확인했어요",
  SELF_REPORT: "직접 적었어요(부모 확인 필요)",
};

/**
 * 무엇으로 확인됐는지 — 직접 적은 것은 부모가 확인했으면(스티커 · 확인해 주기) 그렇다고 적는다.
 * 확인했는지 모르면(`undefined`) 확인이 필요하다고 둔다. 확인된 척하지 않는다(규칙 2)
 */
export function verifiedLabel(by: VerifiedBy, needsGuardianCheck?: boolean | null): string {
  return by === "SELF_REPORT" && needsGuardianCheck === false
    ? "직접 적었어요(부모 확인함)"
    : VERIFIED_COPY[by];
}

/**
 * 이 사람이 이 운동을 지금 할 수 있나. 못 하면 까닭을 돌려준다.
 *
 *   other  참여자가 아니다(형제의 운동, 함께 하지 않는 보호자)
 *   later  앞날 운동이다. 그날 와서 한다
 *   over   지난 운동이다
 *
 * 서버가 이런 칸 끝을 받지 않는다(403 NOT_A_PARTICIPANT, 422 MISSION_NOT_ACTIVE). 시작 단추를 열어 두면
 * 저장은 안 됐는데 칸이 끝난 것처럼 체크됐다. 아이 운동 화면과 부모 운동 화면이 같이 쓴다.
 * 운동을 아직 못 받았으면 막지 않는다(null).
 */
export function playLock(
  mission: Mission | undefined,
  profileId: string | null | undefined,
  now: string,
): "other" | "later" | "over" | null {
  if (!mission) return null;
  if (!mission.participants?.some((p) => p.profileId === profileId)) return "other";
  if (mission.startDate && mission.startDate > now) return "later";
  if (mission.endDate && mission.endDate < now) return "over";
  return null;
}

/**
 * 한 사람의 몫. 끝낸 칸은 그 사람 것으로만 센다(`sessionsOf`). 아이가 끝낸 칸이 보호자 몫으로 보이지 않는다.
 * 참여자가 아니면 null.
 */
export function partOf(
  mission: Mission,
  profileId: string | null | undefined,
): { done: number; total: number } | null {
  if (!profileId || !mission.participants?.some((p) => p.profileId === profileId)) return null;
  const sessions = sessionsOf(mission, profileId);
  return { done: sessions.filter((s) => s.completed).length, total: sessions.length };
}

/** 내 몫의 단추 글 */
export function partAction(part: { done: number; total: number }): string {
  if (part.total > 0 && part.done >= part.total) return "다 했어요";
  return part.done > 0 ? "이어서 하기" : "시작하기";
}

/**
 * 오늘 가족 운동. 오늘이 기간 안에 드는 운동만, 받은 차례대로.
 * 걸음수는 뺀다. 잡아 둔 운동이 아니라 스스로 적는 값이다(규칙 2)
 */
export function familyToday(missions: Mission[] | undefined, now: string): Mission[] {
  return (missions ?? []).filter((m) => {
    if (m.targetMetric === "STEPS") return false;
    const start = m.startDate ?? "";
    const end = m.endDate ?? start;
    return start <= now && now <= end;
  });
}
