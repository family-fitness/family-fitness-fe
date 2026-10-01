"use client";

import { useEffect } from "react";

/** /offline 주소로 바로 들어왔으면(가려던 곳이 없으면) 다시 불러도 이 화면이다. 그때는 처음 화면으로 */
function retry() {
  if (window.location.pathname === "/offline") window.location.replace("/");
  else window.location.reload();
}

/**
 * 끊긴 화면에서 나가는 길 — 다시 붙으면 저절로, 아니면 눌러서.
 * 홈 화면에 얹은 앱에는 새로고침 단추가 없어 앱을 끄기 전까지 이 화면에 갇혔다(9/30 점검).
 * 단추는 스크립트 없이도 도는 링크다 — 끊긴 채 연 화면은 스크립트를 못 받았을 수 있다. 같은 주소를 다시 연다
 */
export function OfflineRetry() {
  useEffect(() => {
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  return (
    <a
      href=""
      onClick={(e) => {
        e.preventDefault();
        retry();
      }}
      className="press bg-signal-strong mt-2 inline-flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
    >
      다시 시도
    </a>
  );
}
