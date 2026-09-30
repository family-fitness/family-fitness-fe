/**
 * 키 · 몸무게 · 체지방률 · 허리둘레가 들어갈 수 있는 범위.
 *
 * 계약서 §측정 등록의 `heightCm?(30~230)` · `weightKg?(5~250)` · `bodyFatPct?(3~60)` · `waistCm?(30~200)` 과 같은 값이다.
 * 두 화면이 각자 숫자를 적어 두고 있었는데, 서버가 범위를 바꾸면 한쪽만 고쳐
 * 나머지가 422 를 맞는다. 여기 한 곳에서 본다.
 * 체지방률 · 허리둘레는 서버가 소수 한 자리까지만 받는다(`decimals`).
 */
type BodyField = "heightCm" | "weightKg" | "bodyFatPct" | "waistCm";

const BODY_RANGE: Record<BodyField, { min: number; max: number; unit: string; decimals?: number }> =
  {
    heightCm: { min: 30, max: 230, unit: "cm" },
    weightKg: { min: 5, max: 250, unit: "kg" },
    bodyFatPct: { min: 3, max: 60, unit: "%", decimals: 1 },
    waistCm: { min: 30, max: 200, unit: "cm", decimals: 1 },
  };

/** 화면에 띄울 안내. "30 ~ 230 cm" */
export function rangeHint(field: BodyField): string {
  const { min, max, unit } = BODY_RANGE[field];
  return `${min} ~ ${max} ${unit}`;
}

/**
 * 적어 넣은 값이 쓸 수 있는가.
 *
 * 빈 칸은 틀린 게 아니다 — 키·몸무게는 비워 둬도 측정이 저장된다.
 * 되돌려 주는 건 잘못됐을 때의 문구고, 괜찮으면 null 이다.
 */
export function bodyError(field: BodyField, raw: string): string | null {
  const text = raw.trim();
  if (text === "") return null;

  const value = Number(text);
  if (!Number.isFinite(value)) return "숫자만 넣어 주세요.";

  const { min, max, unit, decimals } = BODY_RANGE[field];
  if (value < min) return `${min}${unit}보다 커야 해요.`;
  if (value > max) return `${max}${unit}보다 작아야 해요.`;
  if (decimals != null && (text.split(".")[1]?.length ?? 0) > decimals) {
    return "소수 한 자리까지 적어 주세요.";
  }
  return null;
}

/** 서버에 실어 보낼 값. 비었거나 범위를 벗어나면 보내지 않는다 */
export function bodyValue(field: BodyField, raw: string): number | undefined {
  if (bodyError(field, raw) !== null) return undefined;
  const value = Number(raw.trim());
  return raw.trim() === "" || !Number.isFinite(value) ? undefined : value;
}
