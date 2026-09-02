import type { ApiErrorBody } from "./types";

/**
 * 백엔드 호출 규칙을 한 군데로 모은다.
 *
 * 경로를 "/api/v1/..." 상대 경로로 두는 게 핵심이다. next.config.ts 의 rewrites 가
 * 이 경로를 백엔드로 넘겨주므로 브라우저 입장에서는 프론트와 백엔드가 같은 출처가 된다.
 * 세션 쿠키가 그대로 실려 가고, CORS 설정도 필요 없어진다.
 */
const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    // 세션 쿠키 방식이든 토큰 방식이든 쿠키는 항상 실어 보낸다
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    // 백엔드가 아직 없거나 죽었을 때 HTML 에러 페이지가 올 수 있다
    const fallback: ApiErrorBody = {
      code: "UNKNOWN",
      message: `요청에 실패했어요 (${res.status})`,
    };
    const parsed = await res.json().catch(() => fallback);
    const err = parsed as ApiErrorBody;
    throw new ApiError(res.status, err.code ?? "UNKNOWN", err.message ?? fallback.message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
