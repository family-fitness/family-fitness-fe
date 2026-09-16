"use client";

import { useEffect } from "react";

/** 목 서버를 켠 빌드에서는 붙이지 않는다 */
const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * 서비스워커를 붙인다.
 *
 * 한 주소에 워커는 하나만 화면을 잡는다. MSW 도 서비스워커를 쓰기 때문에
 * 목 서버를 켜 둔 동안에는 우리 워커를 붙이지 않는다 — 붙이면 나중에 등록된
 * 쪽이 이겨서 어느 날은 목 데이터가 오고 어느 날은 안 온다.
 *
 * 이미 붙어 있던 것도 떼어 낸다. 운영 주소를 한 번 열었던 브라우저로
 * 개발 서버를 열면 옛 워커가 남아 요청을 가로챈다.
 */
export function PwaProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (MOCKING) {
      void navigator.serviceWorker.getRegistrations().then((list) => {
        for (const reg of list) {
          if (reg.active?.scriptURL.endsWith("/sw.js")) void reg.unregister();
        }
      });
      return;
    }

    // 첫 화면 그리는 일을 방해하지 않게 한가할 때 붙인다
    const attach = () => void navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") attach();
    else window.addEventListener("load", attach, { once: true });
  }, []);

  return null;
}
