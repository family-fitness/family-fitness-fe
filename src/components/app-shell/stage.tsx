import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 본문.
 *
 * 탭바가 없어졌으니 아래 여백은 홈 인디케이터만큼만 둔다.
 * `wide` 는 아이 화면용 — 손가락이 큰 것을 누르게 좌우 여백을 줄인다.
 */
export function Stage({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return <main className={cn("app-main", wide ? "px-4" : "px-5", className)}>{children}</main>;
}

/**
 * 구역 제목.
 * 카드로 감싸지 않는다. 선 하나로 나누는 편이 훑기에 빠르다.
 */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[1.05rem] font-extrabold">{children}</h2>
      {action}
    </div>
  );
}
