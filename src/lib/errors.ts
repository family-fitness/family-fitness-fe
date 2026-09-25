import { ApiError } from "./api/client";

/**
 * 실패를 화면 문구로.
 *
 * 화면마다 `e instanceof ApiError ? ... : "..."` 을 되풀이하고 있었다.
 * 같은 판단을 열여섯 곳에서 따로 하면 한 곳만 고쳐도 나머지가 어긋난다.
 *
 * 두 번째 자리는 그 화면에서만 다르게 말해야 하는 코드표다.
 * 고쳐 말할 코드가 없으면 물러설 문구를 바로 넘긴다.
 */
export function errorMessage(error: unknown, fallback: string): string;
export function errorMessage(
  error: unknown,
  byCode: Record<string, string>,
  fallback: string,
): string;
export function errorMessage(
  error: unknown,
  byCodeOrFallback: Record<string, string> | string,
  fallbackArg?: string,
): string {
  const table = typeof byCodeOrFallback === "string" ? {} : byCodeOrFallback;
  const fallback = typeof byCodeOrFallback === "string" ? byCodeOrFallback : (fallbackArg ?? "");
  if (!(error instanceof ApiError)) return fallback;
  // 이 화면의 말 → 여러 화면이 같은 뜻으로 쓰는 말 → 이 화면이 물러설 말.
  // 전에는 모르는 코드면 일반 문구로 떨어져, 아이 화면에서도 어른 말(「잠시 후 다시 시도해 주세요.」)이 떴다
  return table[error.code] ?? error.commonMessage ?? fallback;
}
