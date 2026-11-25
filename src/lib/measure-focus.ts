/**
 * 측정 화면에 「이 항목을 재러 왔다」 를 넘기는 주소 값(`?items=020,021`).
 *
 * 주소창 값은 누구나 바꿀 수 있다. 여기서는 모양만 거르고(세 자리 숫자), 그 연령대에 있는
 * 항목인지는 화면이 서버에서 받은 목록과 대조해 정한다 — 항목 목록을 프론트가 갖지 않는다(규칙 5).
 */

/** 한 번에 받는 코드 수. 연령대 항목이 열 개 남짓이라 이보다 많으면 주소가 잘못된 것이다 */
const MAX_CODES = 20;

/** `"020,021"` → `["020", "021"]`. 세 자리 숫자가 아닌 조각은 버리고 같은 코드는 한 번만 */
export function parseItemCodes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const codes: string[] = [];
  for (const part of raw.split(",")) {
    const code = part.trim();
    if (/^\d{3}$/.test(code) && !codes.includes(code)) codes.push(code);
    if (codes.length === MAX_CODES) break;
  }
  return codes;
}

/** 측정 화면으로 가는 주소. 넘길 항목이 없으면 그냥 측정 화면 */
export function measureHref(profileId: string, itemCodes: readonly string[] = []): string {
  const base = `/p/${encodeURIComponent(profileId)}/measure`;
  const codes = parseItemCodes(itemCodes.join(","));
  return codes.length > 0 ? `${base}?items=${codes.join(",")}` : base;
}

/**
 * 넘겨받은 항목을 맨 위로. 넘겨받은 차례대로 올리고, 나머지는 서버가 준 차례를 지킨다.
 * 목록에 없는 코드는 아무 일도 하지 않는다.
 */
export function pinFirst<T extends { itemCode?: string | null }>(
  list: readonly T[],
  codes: readonly string[],
): T[] {
  const rank = (item: T) => {
    const at = codes.indexOf(item.itemCode ?? "");
    return at === -1 ? codes.length : at;
  };
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index)
    .map(({ item }) => item);
}

/** 넘겨받은 코드 가운데 이 목록에 있는 것. 장비 구역을 펼칠지 정할 때 쓴다 */
export function codesIn<T extends { itemCode?: string | null }>(
  list: readonly T[],
  codes: readonly string[],
): string[] {
  return codes.filter((code) => list.some((item) => item.itemCode === code));
}

/**
 * 최근 회차의 항목 값 — 코드마다 하나. 측정 화면이 범위 곁에 「최근 측정」 으로 적는다(미리 채우지는 않는다).
 * 회차가 없거나(첫 측정) 값이 숫자가 아니면 그 항목은 없다
 */
export function recentValues(
  items: readonly { itemCode?: string | null; value?: number | null }[] | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items ?? []) {
    if (item.itemCode && typeof item.value === "number" && Number.isFinite(item.value)) {
      out[item.itemCode] = item.value;
    }
  }
  return out;
}
