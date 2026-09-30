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

/** 만 7~10세에 또래 백분위가 모두 비었을 때 보여 주는 까닭 한 줄 */
export const NO_PEER_NORMS_NOTE =
  "만 7~10세는 국민체력100 또래 기준이 없어 점수를 비교할 수 없어요. 적은 기록은 그대로 남아요";

/**
 * 쟀는데 또래와 견줄 값이 하나도 없는 까닭을 한 줄로 돌려준다. 말할 게 없으면 null.
 *
 * 국민체력100 또래 분포 표에는 유소년 만 7~10세 줄이 없다. 그 나이는 재도 백분위가 모두 비어서,
 * 칸마다 「없어요」만 뜨면 측정이 잘못된 것처럼 보인다. FE 는 생일을 받지 않고 연령대만 알아서
 * 「유소년인데 백분위가 하나도 없다」로 가른다(유소년 만 11세 이상은 기준이 있다).
 */
export function noPeerNormsNote({
  ageGroup,
  measured,
  compared,
}: {
  ageGroup: string | null | undefined;
  /** 한 번이라도 쟀나 */
  measured: boolean;
  /** 또래 백분위가 하나라도 있나 */
  compared: boolean;
}): string | null {
  return measured && !compared && ageGroup === "유소년" ? NO_PEER_NORMS_NOTE : null;
}

/**
 * 가족 지도의 아이 한 명으로 `noPeerNormsNote` 를 구한다. 부모 홈 위쪽 카드와 아래쪽 아이 칸이
 * 같은 값으로 가르게 한 곳에 둔다. 측정일을 따로 받았으면 `testedOn` 으로 넘긴다.
 */
export function memberNoPeerNormsNote(
  member: {
    ageGroup?: string | null;
    latest?: { testedOn?: string | null; overallPercentile?: number | null } | null;
  },
  testedOn: string | null | undefined = member.latest?.testedOn,
): string | null {
  return noPeerNormsNote({
    ageGroup: member.ageGroup,
    measured: Boolean(testedOn),
    compared: member.latest?.overallPercentile != null,
  });
}
