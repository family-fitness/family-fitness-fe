/**
 * 가입 유입 경로(utm).
 *
 * 광고 · 공유 링크에 붙은 utm 값을 처음 들어왔을 때 이 기기에 잠시 두었다가 구글 로그인 요청에
 * 실어 보낸다. 백엔드는 처음 가입할 때만 계정에 남기고, 이미 있는 계정이면 쓰지 않는다(BE V174).
 *
 * - 처음 들어온 값만 둔다. 다른 링크로 다시 들어와도 덮어쓰지 않는다(첫 유입 경로)
 * - 로그인이 끝나면 지운다
 * - 캠페인 이름만 다룬다. 광고 추적 코드는 붙이지 않는다
 */
export type SignupSource = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "ff-utm";

/** 서버가 64자로 자른다. 200자를 넘기면 400 이라 보내기 전에 자른다 */
export const UTM_MAX = 64;

const FIELDS = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
] as const;

/** 앞뒤 공백과 제어 문자를 걷고 자른다. 남는 게 없으면 undefined */
function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return text ? text.slice(0, UTM_MAX) : undefined;
}

/** 주소의 검색 부분(`?utm_source=…`)에서 utm 세 값을 읽는다. 하나도 없으면 null */
export function readUtm(search: string): SignupSource | null {
  const params = new URLSearchParams(search);
  const found: SignupSource = {};
  for (const [param, field] of FIELDS) {
    const value = clean(params.get(param));
    if (value) found[field] = value;
  }
  return Object.keys(found).length > 0 ? found : null;
}

function deviceStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** 처음 들어온 주소의 utm 을 기기에 둔다. 이미 둔 값이 있으면 그대로 둔다 */
export function rememberUtm(search: string, store: Store | null = deviceStore()) {
  const found = readUtm(search);
  if (!found || !store) return;
  try {
    if (store.getItem(KEY)) return;
    store.setItem(KEY, JSON.stringify(found));
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 창 등)에서는 보내지 않을 뿐이다
  }
}

/** 기기에 둔 utm. 없거나 깨졌으면 빈 값이라 요청 본문에 펼쳐도 아무것도 붙지 않는다 */
export function savedUtm(store: Store | null = deviceStore()): SignupSource {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const saved: SignupSource = {};
    for (const [, field] of FIELDS) {
      const value = clean((parsed as Record<string, unknown>)[field]);
      if (value) saved[field] = value;
    }
    return saved;
  } catch {
    return {};
  }
}

/** 로그인이 끝나면 지운다 */
export function forgetUtm(store: Store | null = deviceStore()) {
  try {
    store?.removeItem(KEY);
  } catch {
    // 지우지 못해도 다음 로그인에서 서버가 첫 가입 때만 쓰므로 해가 없다
  }
}
