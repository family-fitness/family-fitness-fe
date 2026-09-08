"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 화면 헤더.
 * back 을 켜면 뒤로가기 버튼이 붙는다. 브라우저 뒤로가기에 기대지 않는 이유는
 * PWA 로 설치하면 주소창이 없어서 사용자가 돌아갈 방법이 화면 안에만 있기 때문이다.
 */
export function AppHeader({
  title,
  back,
  action,
}: {
  title: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="bg-paper/90 sticky top-0 z-30 backdrop-blur">
      <div className="pt-[env(safe-area-inset-top)]" />
      <div className="max-w-phone mx-auto flex h-14 items-center gap-1 px-4">
        {back && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="뒤로"
            className="text-mute hover:text-ink -ml-2 p-2"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
        {action}
      </div>
    </header>
  );
}
