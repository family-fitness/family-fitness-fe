import type { ReactNode } from "react";

import { PageTransition } from "./stage";
import { cn } from "@/lib/utils";

/**
 * 화면 본문.
 * 폰 너비 프레임과 탭바 여백은 루트 레이아웃(.app-frame / .app-main)이 맡는다.
 */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <PageTransition>
      <main className={cn("app-main px-4 pt-2", className)}>{children}</main>
    </PageTransition>
  );
}

/** 탭바가 없는 화면(온보딩, 초대)에서 쓴다 */
export function PlainScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <PageTransition>
      <main className={cn("px-4 pt-2 pb-8", className)}>{children}</main>
    </PageTransition>
  );
}
