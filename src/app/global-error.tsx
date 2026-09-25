"use client";

import "./globals.css";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";

/**
 * 뿌리 틀(layout)까지 터졌을 때. error.tsx 는 뿌리 틀 안쪽만 잡아서, 목 서버 · 쿼리 · 워커를 붙이는
 * 자리에서 터지면 Next 의 영어 기본 화면이 떴다. 이 화면은 뿌리 틀을 대신하므로 html · body · 스타일을 직접 둔다.
 * 「처음으로」 는 링크가 아니라 새로 불러오기 — 틀째 다시 세운다.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <title>우리가족 체력키움</title>
        <div className="app-frame relative z-[1]">
          <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
            <Illustration name="scene/kiumi-rest" size={140} />
            <h1 className="page-title">화면을 그리지 못했어요</h1>
            <Button size="md" className="mt-2" onClick={() => retry()}>
              다시 해 볼게요
            </Button>
            <button
              type="button"
              // 뿌리 틀이 터진 자리라 앱 라우터를 믿지 않는다 — 틀째 새로 불러온다
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              onClick={() => window.location.assign("/")}
              className="press text-ink-soft flex min-h-11 items-center px-4 text-sm font-bold"
            >
              처음으로
            </button>
          </PlainScreen>
        </div>
      </body>
    </html>
  );
}
