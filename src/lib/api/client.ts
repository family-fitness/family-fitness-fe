import type { ApiErrorBody } from "./types";

/** 백엔드 호출 규칙을 한 군데로 모은다. */
const BASE = "/api/v1";

/** 오류. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** 서버가 준 개발자용 문구. 로그에만 쓴다 */
    readonly devMessage: string,
  ) {
    super(`${code}: ${devMessage}`);
    this.name = "ApiError";
  }

  /** 화면에 띄울 문구. 코드별 문구가 없으면 뭉뚱그리지 말고 일반 문구를 준다 */
  get userMessage(): string {
    return COMMON_MESSAGE[this.code] ?? "잠시 후 다시 시도해 주세요.";
  }
}

/** 여러 화면에서 같은 뜻인 코드만 여기 둔다. 화면마다 다른 건 그 화면에서 갈라 쓴다 */
const COMMON_MESSAGE: Record<string, string> = {
  UNAUTHORIZED: "다시 로그인해 주세요.",
  NOT_A_PARENT: "보호자만 할 수 있어요.",
  NOT_SAME_FAMILY: "우리 가족이 아니에요.",
  CONSENT_REQUIRED: "보호자 동의가 필요해요.",
  NOT_MEASURABLE: "만 4세부터 측정할 수 있어요.",
  TEMPORARILY_UNAVAILABLE: "지금은 연결이 어려워요. 잠시 후 다시 시도해 주세요.",
};

/** 토큰을 담아 두는 저장소 이름. auth-store 가 이 이름으로 persist 한다 */
export const AUTH_STORAGE_KEY = "ff-auth";

let accessToken: string | null = null;

/** 로그인 후 받은 토큰을 메모리에 둔다. 새로고침하면 refresh 로 다시 받는다 */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * 지금 붙일 토큰.
 *
 * 새로고침 직후에는 zustand persist 가 아직 되살아나지 않아 메모리가 비어 있다.
 * 그 사이에 나간 첫 요청이 머리말 없이 가서 401 을 맞고, 화면은 로그인으로 튕겼다.
 * 저장소를 직접 한 번 들여다봐서 그 틈을 메운다.
 */
function currentToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { state?: { accessToken?: string | null } };
    accessToken = saved.state?.accessToken ?? null;
    return accessToken;
  } catch {
    return null;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = currentToken();

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    // 서버가 죽었거나 프록시가 HTML 을 돌려줄 수 있다
    const parsed = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      parsed?.error?.code ?? "UNKNOWN",
      parsed?.error?.message ?? `HTTP ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

/** 쿼리스트링을 만든다. undefined 인 값은 빼서 빈 파라미터가 안 붙게 한다 */
export function query(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}`;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
