import type { FitnessItem, ItemResult, RadarPoint } from "./api/types";

/**
 * 체력 여섯 요인.
 *
 * **순서와 개수를 고정한다.** 서버가 준 것만 그리면 사람마다 축이 달라져서
 * 도형을 견줄 수가 없다 — 어제의 나와도, 옆집 아이와도. 육각형이 뜻을 가지려면
 * 꼭지점이 늘 같은 자리에 있어야 한다.
 *
 * 국민체력100 규준이 아직 없는 요인은 **0으로 그리지 않는다.** 0% 막대를 그리면
 * 꼴찌처럼 보이는데, 안 잰 것과 못한 것은 다르다(도메인 규칙 8).
 */
export const FACTORS = ["심폐지구력", "근력", "근지구력", "유연성", "민첩성", "순발력"] as const;

export type Factor = (typeof FACTORS)[number];

/** 축 이름이 길면 도형 밖에서 두 줄이 된다. 짧은 이름을 따로 둔다 */
export const FACTOR_SHORT: Record<Factor, string> = {
  심폐지구력: "심폐",
  근력: "근력",
  근지구력: "근지구",
  유연성: "유연성",
  민첩성: "민첩성",
  순발력: "순발력",
};

/** 이 요인이 무엇인지 한 마디. 처음 보는 부모가 읽는다 */
export const FACTOR_NOTE: Record<Factor, string> = {
  심폐지구력: "오래 뛰어도 숨이 덜 차는 힘",
  근력: "한 번에 낼 수 있는 힘",
  근지구력: "같은 동작을 오래 버티는 힘",
  유연성: "몸이 얼마나 부드럽게 굽는지",
  민첩성: "방향을 빠르게 바꾸는 힘",
  순발력: "짧은 순간에 터뜨리는 힘",
};

/** 육각형 한 꼭지점 */
export interface FactorPointView {
  factor: Factor;
  /** 또래 백분위 0~100. **안 잰 요인은 null** — 0이 아니다 */
  percentile: number | null;
}

/**
 * 서버가 준 레이더를 **여섯 꼭지점으로 정렬**한다.
 *
 * 서버는 연령대에 따라 다섯 개만 주기도 하고, 협응력·평형성처럼 육각형에 없는
 * 요인을 주기도 한다. 없는 것은 null 로 두고, 육각형에 없는 것은 버린다.
 */
export function toHexagon(points: RadarPoint[] | null | undefined): FactorPointView[] {
  const given = new Map<string, number | null>();
  for (const p of points ?? []) {
    if (p.factor) given.set(p.factor, p.percentile ?? null);
  }
  return FACTORS.map((factor) => ({
    factor,
    percentile: given.has(factor) ? (given.get(factor) ?? null) : null,
  }));
}

/** 잰 것이 몇 개인지. 셋이 안 되면 도형을 잇지 않는다 */
export function measuredCount(points: FactorPointView[]): number {
  return points.filter((p) => p.percentile != null).length;
}

/**
 * 요인마다 그 요인을 잰 항목을 찾는다.
 *
 * 측정 결과(`ItemResult`)에는 요인이 없고, 항목 목록(`GET /fitness/items`)에만 있다.
 * 코드로 둘을 잇는다. 한 요인을 두 항목이 재면 백분위가 높은 쪽이 아니라
 * **먼저 온 쪽**을 쓴다 — 서버가 레이더에 쓴 순서를 따른다.
 *
 * 「상위 N%」 같은 문구는 여기서 만들지 않는다. 항목에 서버가 붙여 준
 * `topPercentText` 를 그대로 쓴다(규칙 9).
 */
export function itemsByFactor(
  results: ItemResult[] | null | undefined,
  catalog: FitnessItem[] | null | undefined,
): Map<Factor, ItemResult> {
  const factorOf = new Map<string, string>();
  for (const item of catalog ?? []) {
    if (item.itemCode && item.factor) factorOf.set(item.itemCode, item.factor);
  }
  const out = new Map<Factor, ItemResult>();
  for (const r of results ?? []) {
    const f = r.itemCode ? factorOf.get(r.itemCode) : undefined;
    if (f && isFactor(f) && !out.has(f)) out.set(f, r);
  }
  return out;
}

export function isFactor(v: string | null | undefined): v is Factor {
  return (FACTORS as readonly string[]).includes(v ?? "");
}
