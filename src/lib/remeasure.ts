/**
 * 며칠이 지나면 다시 재자고 말할지.
 *
 * 아이 키는 한 달에도 달라진다(회의: "한 달이면 5cm 큰 아이도 있다"). 지난 키로 계속
 * 견주면 점수가 틀어진다. 홈 · 아이 기록 · 알림이 같은 기준을 쓴다(규칙 11).
 */
export const REMEASURE_DAYS = 30;

/**
 * 그날 잰 회차가 이미 있는가. 서버는 하루에 한 회차만 받고(같은 날이면 409 DUPLICATE_DATE),
 * 있는 회차에 항목을 더하는 길이 없다. 다 적고 나서 막히면 적은 게 헛수고라 날짜를 고른 자리에서 먼저 말한다
 */
export function measuredOn(
  tests: readonly { testedOn: string }[] | undefined,
  date: string,
): boolean {
  return Boolean(date) && (tests ?? []).some((test) => test.testedOn === date);
}
