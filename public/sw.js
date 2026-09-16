/**
 * 서비스워커.
 *
 * 하는 일은 둘이다.
 *   1. 홈 화면에 설치할 수 있게 한다 — 크롬은 fetch 를 듣는 워커가 있어야 설치를 권한다
 *   2. 인터넷이 끊겨도 우리 화면을 띄운다 — 브라우저 오류 화면보다 낫다
 *
 * 하지 않는 일이 더 중요하다. **API 응답은 절대 저장하지 않는다.**
 * 어제 점수를 오늘 점수인 척 보여주는 건 아무것도 안 보여주는 것보다 나쁘다.
 *
 * 빌드 도구를 끼우지 않고 직접 썼다. Serwist 는 Next 16 의 Turbopack 을
 * 아직 지원하지 않는다.
 */

/** 배포할 때마다 올린다. 올리면 옛 저장분이 지워진다 */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;

/** 끊겼을 때 보여줄 화면 */
const OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => !n.endsWith(VERSION)).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

/** 오래 두고 써도 되는 것 — 이름에 해시가 붙거나 내용이 바뀌지 않는 파일 */
function isDurable(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/assets/");
}

/** 손대면 안 되는 것 */
function isOffLimits(url) {
  return (
    url.pathname.startsWith("/api/") ||
    // 개발용 목 서버의 워커
    url.pathname === "/mockServiceWorker.js" ||
    url.pathname === "/sw.js"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isOffLimits(url)) return;

  // 화면 이동: 먼저 인터넷에 물어보고, 안 되면 끊김 화면
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached ?? (await caches.match(OFFLINE)) ?? Response.error();
      }),
    );
    return;
  }

  // 바뀌지 않는 파일: 있으면 그대로 주고, 없으면 받아서 넣어 둔다
  if (isDurable(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(ASSETS).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
