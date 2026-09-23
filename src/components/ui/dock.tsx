import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 아래에 붙는 단추 자리.
 *
 * 붙어 있는 동안에는 화면이 이만큼 아래를 비워 두고 스크롤한다(`globals.css` 의
 * `html:has(.dock)`) — 스크롤로 불러오거나 키보드로 옮겨 간 칸이 이 단추 밑에 숨지 않게.
 * 페이지 쪽에도 아래 여백(`pb-28` 쯤)을 둬야 마지막 칸까지 올라온다.
 */
export function Dock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "dock bg-ground/95 fixed inset-x-0 bottom-0 z-20 mx-auto max-w-(--width-phone) px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
