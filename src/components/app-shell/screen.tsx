import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 본문 컨테이너.
 *
 * 모바일 우선이고, 데스크톱에서는 가운데 정렬된 폰 너비로 본다.
 * 아래는 탭바에 가리지 않도록 탭바 높이 + 안전 영역만큼 띄운다.
 */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        "max-w-phone mx-auto w-full px-4 pt-2",
        "pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+1.5rem)]",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** 탭바가 없는 화면(온보딩, 미션 수행)에서 쓰는 컨테이너 */
export function PlainScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        "max-w-phone mx-auto w-full px-4 pt-2",
        "pb-[calc(env(safe-area-inset-bottom)+2rem)]",
        className,
      )}
    >
      {children}
    </main>
  );
}
