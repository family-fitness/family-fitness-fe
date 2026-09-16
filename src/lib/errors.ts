import { ApiError } from "./api/client";

/**
 * 실패를 화면 문구로.
 *
 * 화면마다 `e instanceof ApiError ? ... : "..."` 을 되풀이하고 있었다.
 * 같은 판단을 열여섯 곳에서 따로 하면 한 곳만 고쳐도 나머지가 어긋난다.
 *
 * `byCode` 는 그 화면에서만 다르게 말해야 하는 코드다. 없으면 공통 문구를 쓴다.
 */
export function errorMessage(
  error: unknown,
  byCode: Record<string, string> = {},
  fallback = "잠시 후 다시 시도해 주세요.",
): string {
  if (!(error instanceof ApiError)) return fallback;
  return byCode[error.code] ?? error.userMessage;
}
