import type { VerifiedBy } from "./api/types";

/** 무엇으로 확인됐는지. */
export const VERIFIED_COPY: Record<VerifiedBy, string> = {
  VIDEO_PROGRESS: "영상 완주로 확인됨",
  TIMER: "타이머로 확인됨",
  SELF_REPORT: "직접 입력함 · 부모 확인 필요",
};

/**
 * 영상을 끝까지 봤다고 보는 기준.
 * 서버도 이 값으로 활동을 적립한다 — 화면이 다른 숫자를 쓰면 "완주했는데
 * 기록이 없어요" 가 된다.
 */
const VIDEO_DONE = 0.9;

/** 이 영상을 완주했는가 */
export function isVideoDone(maxProgress: number | null | undefined): boolean {
  return (maxProgress ?? 0) >= VIDEO_DONE;
}
