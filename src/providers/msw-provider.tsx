"use client";

import { useEffect, useState, type ReactNode } from "react";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/** 목 서버가 켜져 있으면 서비스워커가 붙을 때까지 렌더를 미룬다. */
let startPromise: Promise<void> | null = null;

function startWorker() {
  startPromise ??= (async () => {
    const { worker } = await import("@/mocks/browser");
    await worker.start({
      // 우리가 정의하지 않은 요청(폰트, 이미지 등)까지 경고하지 않는다
      onUnhandledRequest: "bypass",
      quiet: true,
    });
  })();
  return startPromise;
}

export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!MOCKING_ENABLED);

  useEffect(() => {
    if (!MOCKING_ENABLED) return;

    let cancelled = false;
    void startWorker()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error: unknown) => {
        // 워커가 안 붙어도 화면은 떠야 한다. 실패는 콘솔에만 남긴다
        console.error("[msw] 목 서버를 시작하지 못했습니다", error);
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
