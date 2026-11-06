import type { FitnessAgeItem, FitnessAgeTest } from "./api/types";

/**
 * 체력 나이의 화면 말과 자리. 값은 서버가 셈한 그대로 쓰고 여기서 다시 셈하지 않는다.
 *
 * 체력 나이가 실제 나이보다 많아도 탓하지 않는다. 몇 살 차이인지만 말한다(「죄책감을 주지 않는다」).
 */

/** 정수면 소수점 없이, 평균이면 소수 첫째 자리까지 */
export function ageText(age: number): string {
  return `${Number(age.toFixed(1))}세`;
}

/** 항목 나이. 표의 끝에 걸렸으면 그 끝을 넘을 수 있다는 뜻으로 적는다 */
export function itemAgeText(item: Pick<FitnessAgeItem, "itemAge" | "bound">): string {
  if (item.bound === "YOUNGER") return `${ageText(item.itemAge)} 이하`;
  if (item.bound === "OLDER") return `${ageText(item.itemAge)} 이상`;
  return ageText(item.itemAge);
}

/** 실제 나이와의 차이 한 줄 */
export function ageGapLine(age: number, gap: number): string {
  if (gap === 0) return `실제 나이 ${age}세와 같아요`;
  return gap < 0
    ? `실제 나이 ${age}세보다 ${-gap}살 젊어요`
    : `실제 나이 ${age}세보다 ${gap}살 많아요`;
}

/** 나이 축에서의 자리(%). 범위 밖은 끝에 붙는다 */
export function agePosition(age: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((age - min) / (max - min)) * 100));
}

/** 체력 나이가 있는 회차만, 오래된 것부터 */
export function trendOf(
  tests: readonly FitnessAgeTest[],
): (FitnessAgeTest & { fitnessAge: number })[] {
  return tests
    .filter((t): t is FitnessAgeTest & { fitnessAge: number } => t.fitnessAge != null)
    .sort((a, b) => a.testedOn.localeCompare(b.testedOn));
}

/** 지난 회차와 견준 한 줄. 견줄 회차가 없으면 null */
export function changeLine(tests: readonly FitnessAgeTest[]): string | null {
  const trend = trendOf(tests);
  if (trend.length < 2) return null;
  const change = trend[trend.length - 1].fitnessAge - trend[trend.length - 2].fitnessAge;
  if (change === 0) return "지난 측정과 같아요";
  return change < 0
    ? `지난 측정보다 ${-change}살 젊어졌어요`
    : `지난 측정보다 ${change}살 많아졌어요`;
}

/** 항목이 모자라 계산하지 못할 때 */
export function moreItemsLine(minItems: number, used: number): string {
  return `항목을 ${Math.max(1, minItems - used)}개 더 측정하면 나와요`;
}
