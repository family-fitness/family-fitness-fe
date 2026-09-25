"use client";

import Link from "next/link";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";

/**
 * 화면을 그리다 터졌을 때 — Next 의 영어 기본 화면 대신. 다시 해 보거나 처음으로.
 * 홈 화면 앱에는 브라우저 뒤로가 없어 나갈 길이 있어야 한다.
 */
export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      <Illustration name="scene/kiumi-rest" size={140} />
      <h1 className="page-title">화면을 그리지 못했어요</h1>
      <Button size="md" className="mt-2" onClick={() => retry()}>
        다시 해 볼게요
      </Button>
      <Link
        href="/"
        className="press text-ink-soft flex min-h-11 items-center px-4 text-sm font-bold"
      >
        처음으로
      </Link>
    </PlainScreen>
  );
}
