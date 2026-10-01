"use client";

import { useEffect, useState, type ReactNode } from "react";

const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/** 목 서버가 켜져 있으면 서비스워커가 붙을 때까지 렌더를 미룬다. */
let startPromise: Promise<void> | null = null;

function startWorker() {
  // 조건을 이 자리에 식 그대로 둔다 — 빌드가 값을 박으면 아래 import 가 통째로 빠져, 실제 서버 빌드에
  // 목 서버(가짜 계정 · 초대 코드 · 모든 처리기)가 실리지 않는다(9/30 보안 점검)
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return Promise.resolve();
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

// 받기는 이 파일이 읽히는 순간 시작한다 — effect(하이드레이션 뒤)에서야 118KB 를 받기 시작해 목 빌드의 첫 그림이
// 1.2~1.5초로 늦었다(9/30 성능 점검). 실제 서버 빌드는 startWorker 가 곧바로 돌아온다
if (typeof window !== "undefined") void startWorker().catch(() => {});

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
