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

/**
 * 새로 받은 토큰을 auth-store 에 넘기는 곳. client 가 store 를 부르면 서로 부르는 고리가 생겨서
 * store 가 스스로 여기에 걸어 둔다(`setTokenSink`).
 */
type TokenSink = (tokens: { accessToken: string; refreshToken: string | null }) => void;
let tokenSink: TokenSink | null = null;
export function setTokenSink(sink: TokenSink | null) {
  tokenSink = sink;
}

function savedRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { state?: { refreshToken?: string | null } };
    return saved.state?.refreshToken ?? null;
  } catch {
    return null;
  }
}

/**
 * 새 토큰을 저장소(ff-auth)에도 바로 적는다. auth-store 는 몇몇 화면에서만 불러와서 sink 가 없는
 * 화면이 있다 — 그때 저장소가 옛 토큰으로 남으면 새로고침하거나 설정으로 가는 순간 옛 토큰이 되살아난다.
 */
function persistTokens(access: string, refresh: string | null) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as { state?: Record<string, unknown> }) : {};
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        ...saved,
        state: { ...(saved.state ?? {}), accessToken: access, refreshToken: refresh },
      }),
    );
  } catch {
    // 저장소를 못 써도 이번 탭은 메모리 토큰으로 돈다
  }
}

let refreshing: Promise<boolean> | null = null;

/**
 * 액세스 토큰은 한 시간이면 끝난다(서버 설정). 401 을 맞으면 리프레시 토큰으로 **한 번만** 새로 받고
 * 다시 부른다 — 여러 요청이 같이 맞아도 새로 받기는 한 번이다. 못 받으면 원래 401 을 그대로 돌려
 * 로그인으로 보낸다. 이게 없으면 한 시간마다 로그인 화면으로 튕긴다.
 */
function refreshOnce(): Promise<boolean> {
  if (refreshing) return refreshing;
  const token = savedRefreshToken();
  if (!token) return Promise.resolve(false);
  refreshing = fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: token }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = (await res.json().catch(() => null)) as {
        accessToken?: string;
        refreshToken?: string;
      } | null;
      if (!body?.accessToken) return false;
      accessToken = body.accessToken;
      persistTokens(body.accessToken, body.refreshToken ?? token);
      tokenSink?.({ accessToken: body.accessToken, refreshToken: body.refreshToken ?? token });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; retried?: boolean };

/**
 * 경로 조각에 「.」 · 「..」 가 섞이면 브라우저가 경로를 접어서 다른 엔드포인트로 간다.
 * `path` 가 값을 인코딩하지만, 손으로 이은 주소가 섞여도 여기서 한 번 더 막는다.
 */
function traverses(path: string): boolean {
  return path
    .split(/[?#]/)[0]
    .split("/")
    .some((seg) => {
      const plain = seg.replace(/%2e/gi, ".");
      return plain === "." || plain === "..";
    });
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, retried, ...rest } = options;
  if (traverses(path)) throw new ApiError(400, "BAD_PATH", `경로가 올바르지 않습니다: ${path}`);
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

  // 토큰이 끝났다 — 한 번만 새로 받고 다시 부른다. 로그인 · 새로 받기 자체는 다시 부르지 않는다.
  // 그 사이 다른 요청이 이미 새로 받아 왔으면(토큰이 바뀌었으면) 또 받지 않고 그 토큰으로 다시 부른다
  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    const latest = currentToken();
    if ((latest != null && latest !== token) || (await refreshOnce())) {
      return request<T>(path, { ...options, retried: true });
    }
  }

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

/**
 * API 경로. 끼워 넣는 값(아이디)은 인코딩한다.
 *
 * 주소창에서 온 값이 경로 조각이 되는 화면이 있다(`/parent/sticker/[id]?missionId=`).
 * 그 값이 `../` 나 `?` 를 품고 있으면 부모 권한으로 다른 엔드포인트를 부르게 된다.
 * `?` 로 시작하는 값은 `query()` 가 만든 조회 문자열이라 그대로 둔다.
 *
 *   api.post(path`/missions/${missionId}/participants/${profileId}/confirm`)
 */
export function path(
  strings: TemplateStringsArray,
  ...values: (string | number | null | undefined)[]
): string {
  // 첫 조각이 처음 값이 되고, i 는 1 부터 돈다
  return strings.reduce((out, piece, i) => {
    const value = String(values[i - 1] ?? "");
    const safe = value === "" || value.startsWith("?") ? value : encodeURIComponent(value);
    return out + safe + piece;
  });
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
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
