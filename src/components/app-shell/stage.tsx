import { ViewTransition, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 전환에서 움직이는 부분. **레이아웃이 아니라 화면 안쪽에 둔다** —
 * 레이아웃은 이동해도 살아 있어서 enter/exit 이 돌지 않는다.
 */
const NAV = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
} as const;

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={NAV} exit={NAV} default="none">
      {children}
    </ViewTransition>
  );
}

/** 화면 본문. `wide` 는 아이 화면용 — 큰 것을 누르게 좌우 여백을 줄인다 */
export function Stage({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <PageTransition>
      <main className={cn("app-main", wide ? "px-4" : "px-5", className)}>{children}</main>
    </PageTransition>
  );
}

/** 구역 제목 */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[1.05rem] font-extrabold">{children}</h2>
      {action}
    </div>
  );
}
