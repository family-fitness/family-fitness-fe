"use client";

import { useEffect } from "react";

/**
 * 끊긴 화면에서 나가는 길 — 다시 붙으면 저절로, 아니면 눌러서.
 * 홈 화면에 얹은 앱에는 새로고침 단추가 없어 앱을 끄기 전까지 이 화면에 갇혔다(9/30 점검).
 * 단추는 스크립트 없이도 도는 링크다 — 끊긴 채 연 화면은 스크립트를 못 받았을 수 있다. 같은 주소를 다시 연다
 */
export function OfflineRetry() {
  useEffect(() => {
    const again = () => window.location.reload();
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, []);

  return (
    <a
      href=""
      className="press bg-signal-strong mt-2 inline-flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
    >
      다시 시도
    </a>
  );
}
