"use client";

import { useEffect, useState, type ReactNode } from "react";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * 목 서버가 켜져 있으면 서비스워커가 붙을 때까지 렌더를 미룬다.
 * 안 그러면 첫 요청이 워커를 지나쳐 실제 백엔드(아직 없음)로 가서 실패한다.
 *
 * 시작은 모듈 수준에서 한 번만 한다. React 는 개발 모드(StrictMode)에서 effect 를
 * 두 번 실행하는데, worker.start() 를 두 번 부르면
 * "cannot configure an already enabled network" 로 터진다.
 * 그러면 ready 가 영영 true 가 되지 않아 화면이 통째로 비어 버린다.
 */
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
        // 워커가 안 붙어도 화면은 떠야 한다. 빈 화면보다 실패한 화면이 낫다
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
