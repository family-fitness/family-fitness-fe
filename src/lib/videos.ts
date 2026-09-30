import { safeUrl } from "@/lib/safe-url";

/**
 * 운동 찾기(`/videos`) 주소와 「누구의 목록인가」.
 *
 * 서버는 클립 목록을 보는 사람의 연령대로 거른다(profileId 가 없으면 로그인한 사람). 부모 홈의 영상 줄은
 * 보고 있는 아이의 목록을 보여 주므로, 누르고 들어간 운동 찾기도 같은 아이의 목록이라야 누른 클립이 들어 있다.
 * 홈은 아이를 고른 적이 없으면 첫째를 보여 주는데 운동 찾기는 그걸 모른다 — 그래서 아이를 주소에 실어 보낸다.
 */

/** 홈 영상 줄에서 운동 찾기로 가는 주소. 줄과 같은 목록(본운동 · 이 힘 · 이 아이)으로 연다 */
export function finderHref({
  factor,
  profileId,
  clipId,
}: {
  factor: string | null;
  profileId: string | undefined;
  clipId?: string;
}): string {
  const q = new URLSearchParams({ phase: "MAIN" });
  if (factor) q.set("factor", factor);
  if (profileId) q.set("profileId", profileId);
  if (clipId) q.set("clip", clipId);
  return `/videos?${q.toString()}`;
}

/**
 * 운동 찾기에서 목록 · 즐겨찾기의 주인.
 * 아이 화면은 이 기기의 아이만 — 주소로 다른 아이 목록이 열리지 않게. 부모 화면은 주소의 아이 → 고른 아이 → 나.
 */
export function finderOwner({
  kidView,
  fromUrl,
  childProfileId,
  self,
}: {
  kidView: boolean;
  fromUrl: string | null;
  childProfileId: string | null;
  self: string | undefined;
}): string | undefined {
  if (kidView) return childProfileId ?? undefined;
  return fromUrl || childProfileId || self;
}

/**
 * 공단 mp4 를 못 틀었을 때(`<video>` 의 error · stalled) 다음에 할 일.
 *
 * 공단 서버 두 대 가운데 한 대가 Content-Type 을 video/mg4 로 준다 — 요청마다 절반 확률이다.
 * 같은 주소를 다시 부르면 다른 서버가 받을 수 있으니 한 번은 다시 불러(`load()`) 본다.
 * 두 번째도 못 틀면 그때 「이 기기에서 영상을 열지 못했어요」 를 띄운다.
 *
 * @param reloads 이 주소를 이미 다시 부른 횟수
 */
export const FILE_RELOADS = 1;
export function afterFileFailure(reloads: number): "reload" | "give-up" {
  return reloads < FILE_RELOADS ? "reload" : "give-up";
}

/**
 * `<source type>` 에 적을 형식. 주소가 .mp4 로 끝나면 video/mp4, 아니면 적지 않는다(undefined).
 * 서버가 준 Content-Type 을 바꾸지는 못하지만, 브라우저가 이 파일을 틀 수 있는지 먼저 고를 때 쓴다
 */
export function fileType(url: string): string | undefined {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return undefined;
  }
  return path.toLowerCase().endsWith(".mp4") ? "video/mp4" : undefined;
}

/**
 * 앱 안 영상 화면(`/watch`)이 틀어 주는 주소 — 공단 영상(https://openapi.kspo.or.kr/web/video/…)만.
 * 다른 주소면 undefined 를 돌려준다. `/watch` 가 아무 주소나 넣어 여는 창이 되지 않게 한다.
 * 주소는 URL 로 풀어 본다 — `..` 로 올라가는 경로, 계정 · 포트가 붙은 주소, http 는 받지 않는다
 */
const KSPO_HOST = "openapi.kspo.or.kr";
const KSPO_VIDEO_PATH = "/web/video/";

export function kspoVideo(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const ok =
    u.protocol === "https:" &&
    u.hostname === KSPO_HOST &&
    !u.port &&
    !u.username &&
    !u.password &&
    u.pathname.startsWith(KSPO_VIDEO_PATH) &&
    u.pathname.length > KSPO_VIDEO_PATH.length;
  return ok ? u.href : undefined;
}

/**
 * 공단 mp4 를 여는 앱 안 주소. 공단 영상이 아니면 undefined.
 *
 * 공단 서버 두 대 가운데 한 대가 요청마다 절반 확률로 Content-Type 을 video/mg4 로 준다. 앱 안 `<video>` 는 파일
 * 내용을 보고 튼다. 그런데 주소를 새 창으로 바로 열면 브라우저가 영상인 줄 몰라 파일로 내려받는다
 */
export function watchHref(url: string | null | undefined, title?: string): string | undefined {
  const src = kspoVideo(url);
  if (!src) return undefined;
  const q = new URLSearchParams({ src });
  if (title) q.set("title", title);
  return `/watch?${q.toString()}`;
}

/** 영상 주소를 누르면 갈 곳. 공단 영상은 앱 안 영상 화면(`inApp`), 그 밖(유튜브 …)은 지금처럼 밖으로 */
export function videoLink(
  url: string | null | undefined,
  title: string,
): { href: string; inApp: boolean } | undefined {
  const inside = watchHref(url, title);
  if (inside) return { href: inside, inApp: true };
  const outside = safeUrl(url);
  return outside ? { href: outside, inApp: false } : undefined;
}

/** 영상 화면 제목. 주소로 들어오는 값이라 앞뒤 빈칸을 빼고 길이를 자른다 */
export const WATCH_TITLE_MAX = 60;
export function watchTitle(raw: string | null | undefined): string {
  const title = raw?.trim();
  return title ? title.slice(0, WATCH_TITLE_MAX) : "시범 영상";
}

/**
 * 운동 찾기는 목록을 한 페이지씩 받는다. 받은 페이지를 차례대로 잇고, 같은 클립이 두 번 오면 처음 것만 둔다.
 * 페이지를 받는 사이에 목록이 바뀌면(즐겨찾기를 누르는 등) 앞 페이지 끝의 클립이 다음 페이지 앞에 다시 올 수 있다
 */
export function joinClipPages<T extends { clipId: string }>(
  pages: readonly { clips: readonly T[] }[] | undefined,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const page of pages ?? []) {
    for (const c of page.clips) {
      if (seen.has(c.clipId)) continue;
      seen.add(c.clipId);
      out.push(c);
    }
  }
  return out;
}

/** 다음 페이지를 받을 때 보낼 값. 서버가 주지 않았거나 null 이면 마지막 페이지다 */
export function nextCursorOf(page: { nextCursor?: string | null }): string | undefined {
  return page.nextCursor ?? undefined;
}

/** 운동 찾기 맨 위에 쓰는 영상 수 */
export function finderCount(total: number): string {
  return `영상 ${total.toLocaleString("ko-KR")}개`;
}

/** 영상 수 아래에 쓰는 거른 조건. 고른 힘과 나이 범위를 적는다 */
export function finderScope({
  factor,
  allAges,
}: {
  factor: string | null;
  allAges: boolean;
}): string {
  return `${factor ?? "모든 힘"}, ${allAges ? "모든 나이" : "나이에 맞는 것만"}`;
}
