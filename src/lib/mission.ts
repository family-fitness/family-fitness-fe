import type { VerifiedBy } from "./api/types";

/** 무엇으로 확인됐는지. */
export const VERIFIED_COPY: Record<VerifiedBy, string> = {
  VIDEO_PROGRESS: "영상 보며 따라 했어요",
  TIMER: "타이머로 확인했어요",
  SELF_REPORT: "직접 적었어요(부모 확인 필요)",
};
