"use client";

import { useEffect, useState, type ReactNode } from "react";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * 목 서버가 켜져 있으면 서비스워커가 붙을 때까지 렌더를 미룬다.
 * 안 그러면 첫 요청이 워커를 지나쳐 실제 백엔드(없음)로 가서 실패한다.
 */
export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!MOCKING_ENABLED);

  useEffect(() => {
    if (!MOCKING_ENABLED) return;

    let cancelled = false;
    void (async () => {
      const { worker } = await import("@/mocks/browser");
      await worker.start({
        // 우리가 정의하지 않은 요청(폰트, 이미지 등)까지 경고하지 않는다
        onUnhandledRequest: "bypass",
        quiet: true,
      });
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
