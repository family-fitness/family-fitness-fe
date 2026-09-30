/**
 * AI 편성이 실패한 까닭(`CoachRunView.failureCode`)을 화면 말로.
 *
 * 서버는 코드만 주고 문구는 화면이 정한다(api-contract 4장). 모르는 코드면 물러설 말을 쓴다 —
 * 코드값을 그대로 내보내지 않는다.
 */
const FAILURE_COPY: Record<string, string> = {
  NO_CITATIONS: "국민체력100 처방에서 근거를 찾지 못해 짜지 않았어요.",
  AI_FAILED: "코치가 이번에는 운동을 짜지 못했어요.",
  CONSENT_REQUIRED: "보호자 동의가 없어 짜지 못했어요.",
  BUSY: "지금 짜 달라는 요청이 많아요. 잠시 뒤에 다시 해 주세요.",
  STALE: "짜는 데 너무 오래 걸려 멈췄어요.",
  ERROR: "짜다가 문제가 생겼어요.",
};

export function failureText(code: string | null | undefined): string {
  return (code && FAILURE_COPY[code]) || "짜다가 문제가 생겼어요.";
}
