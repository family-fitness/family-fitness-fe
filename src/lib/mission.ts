import type { VerifiedBy } from "./api/types";

/** 무엇으로 확인됐는지. */
export const VERIFIED_COPY: Record<VerifiedBy, string> = {
  VIDEO_PROGRESS: "영상 완주로 확인됨",
  TIMER: "타이머로 확인됨",
  SELF_REPORT: "직접 입력함 · 부모 확인 필요",
};

/**
 * 무엇으로 확인됐는지 — 직접 적은 것은 부모가 확인했으면(스티커 · 확인해 주기) 그렇다고 적는다.
 * 확인했는지 모르면(`undefined`) 확인이 필요하다고 둔다. 확인된 척하지 않는다(규칙 2)
 */
export function verifiedLabel(by: VerifiedBy, needsGuardianCheck?: boolean | null): string {
  return by === "SELF_REPORT" && needsGuardianCheck === false
    ? "직접 입력함 · 부모 확인함"
    : VERIFIED_COPY[by];
}
