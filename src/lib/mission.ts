import type { TargetMetric, VerifiedBy } from "./api/types";

/**
 * 미션 목표를 사람 말로.
 * 코드값(TIMER_MINUTES)을 화면에 그대로 내보내지 않는다.
 */
export function targetCopy(metric: TargetMetric | string | undefined, value: number | undefined) {
  switch (metric) {
    case "VIDEO_DONE":
      return value && value > 1 ? `영상 ${value}회 완주` : "영상 완주";
    case "TIMER_MINUTES":
      return `${value ?? 0}분 운동`;
    case "STEPS":
      return `${(value ?? 0).toLocaleString("ko-KR")}걸음`;
    default:
      return `${value ?? ""}`;
  }
}

/** 무엇으로 확인됐는지. */
export const VERIFIED_COPY: Record<VerifiedBy, string> = {
  VIDEO_PROGRESS: "영상 완주로 확인됨",
  TIMER: "타이머로 확인됨",
  SELF_REPORT: "직접 입력함 · 부모 확인 필요",
};

/** 서버가 확인할 수 있는 종류인지. 걸음수만 아니다 */
export function serverKnows(verifiedBy: VerifiedBy | null | undefined) {
  return verifiedBy === "VIDEO_PROGRESS" || verifiedBy === "TIMER";
}

/**
 * 영상을 끝까지 봤다고 보는 기준.
 * 서버도 이 값으로 활동을 적립한다 — 화면이 다른 숫자를 쓰면 "완주했는데
 * 기록이 없어요" 가 된다.
 */
export const VIDEO_DONE = 0.9;

/** 이 영상을 완주했는가 */
export function isVideoDone(maxProgress: number | null | undefined): boolean {
  return (maxProgress ?? 0) >= VIDEO_DONE;
}

/** 목표 대비 진행률(0~1) 을 퍼센트 정수로. 서버는 double 로 준다 */
export function progressPercent(progress: number | null | undefined) {
  return Math.max(0, Math.min(100, Math.round((progress ?? 0) * 100)));
}
