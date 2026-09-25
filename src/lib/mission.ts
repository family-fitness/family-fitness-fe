import type { VerifiedBy } from "./api/types";

/** 무엇으로 확인됐는지. */
export const VERIFIED_COPY: Record<VerifiedBy, string> = {
  VIDEO_PROGRESS: "영상 완주로 확인됨",
  TIMER: "타이머로 확인됨",
  SELF_REPORT: "직접 입력함 · 부모 확인 필요",
};
