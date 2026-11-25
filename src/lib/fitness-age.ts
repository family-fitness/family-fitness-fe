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

/**
 * 지난 회차와 견준 한 줄. 견줄 회차가 없으면 null.
 * 셈에 쓴 항목 수가 다르면 견주지 않는다 — 다섯 항목으로 32세, 두 항목으로 25세가 나와 「7살 젊어졌어요」 라고 했지만
 * 몸이 바뀐 게 아니라 잰 항목이 바뀐 것이었다(11/23 실제 서버로 확인)
 */
export function changeLine(tests: readonly FitnessAgeTest[]): string | null {
  const trend = trendOf(tests);
  if (trend.length < 2) return null;
  const [before, now] = trend.slice(-2);
  if (before.itemCount !== now.itemCount) return null;
  const change = now.fitnessAge - before.fitnessAge;
  if (change === 0) return "지난 측정과 같아요";
  return change < 0
    ? `지난 측정보다 ${-change}살 젊어졌어요`
    : `지난 측정보다 ${change}살 많아졌어요`;
}

/**
 * 항목이 모자라 계산하지 못할 때. 서버는 가장 최근 회차 하나로만 셈하고, 다시 재면 새 회차가 된다.
 * 그래서 「1개 더」 가 아니라 한 회차에 몇 개를 함께 재야 하는지 말한다 — 1개 더 재러 가면 그 1개만 든 새 회차가 되어
 * 다시 「아직 계산할 수 없어요」 였다(11/23 실제 서버로 확인)
 */
export function moreItemsLine(minItems: number): string {
  return `한 번에 ${minItems}개 이상 측정하면 나와요`;
}

/** 항목이 모자란 회차를 볼 때 함께 적는 가장 최근의 체력 나이. 셈한 회차가 없으면 null */
export function lastKnownAge(
  tests: readonly FitnessAgeTest[],
): (FitnessAgeTest & { fitnessAge: number }) | null {
  return trendOf(tests).at(-1) ?? null;
}

/**
 * 항목 이름은 측정 화면과 같은 라벨로(규칙 5). 왕복오래달리기는 연령대마다 거리가 달라 라벨이 따로 온다.
 * 체력 나이 응답에는 이름(itemName)만 오므로 그 연령대 항목 목록에서 코드로 찾고, 없으면 받은 이름 그대로 쓴다
 */
export function itemLabelOf(
  itemCode: string,
  itemName: string,
  catalogue: readonly { itemCode?: string | null; itemLabel?: string | null }[] | undefined,
): string {
  return catalogue?.find((item) => item.itemCode === itemCode)?.itemLabel || itemName;
}

/**
 * 더 측정할 항목 — 맨몸으로 재는 것을 앞에(서버 차례는 그 안에서 지킨다). 측정 화면도 넘겨받은 차례대로 위에 올리므로
 * 바로 잴 수 있는 것부터 보인다
 */
export function missingInOrder<T extends { equipment?: string | null }>(items: readonly T[]): T[] {
  return [...items.filter((m) => !m.equipment), ...items.filter((m) => m.equipment)];
}

/** 항목 이름 곁에 필요한 것 — 「상대악력(악력계)」. 맨몸이면 이름만 */
export function missingName(label: string, equipment: string | null | undefined): string {
  return equipment ? `${label}(${equipment})` : label;
}
