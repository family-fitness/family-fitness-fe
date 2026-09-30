"use client";

import { useEffect, useState, type ReactNode } from "react";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/** 목 서버가 켜져 있으면 서비스워커가 붙을 때까지 렌더를 미룬다. */
let startPromise: Promise<void> | null = null;

function startWorker() {
  startPromise ??= (async () => {
    /*
      import 바로 앞에서 process.env 를 그대로 다시 본다. 빌드가 이 조건을 거짓으로 풀어야
      목 조각(MSW · 목 데이터 · 개발용 계정)을 운영 번들에 만들지 않는다. MOCKING_ENABLED 처럼
      변수를 한 번 거치면 Turbopack 이 풀지 못해, 부르지도 않는 목 조각이 .next/static 에 남았다.
    */
    if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") {
      const { worker } = await import("@/mocks/browser");
      await worker.start({
        // 우리가 정의하지 않은 요청(폰트, 이미지 등)까지 경고하지 않는다
        onUnhandledRequest: "bypass",
        quiet: true,
      });
    }
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
