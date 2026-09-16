import { ViewTransition, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 전환에서 움직이는 부분.
 *
 * 앞으로 갈 때는 오른쪽에서, 뒤로 갈 때는 왼쪽에서 들어온다. 방향이 없으면
 * 화면이 툭 바뀌어서 웹페이지처럼 보인다.
 *
 * **레이아웃이 아니라 화면 안쪽에 둬야 한다.** 레이아웃은 이동해도 그대로 살아
 * 있어서 enter/exit 이 아예 돌지 않는다.
 *
 * 타입이 없는 이동(브라우저 뒤로가기, 새로고침)은 `default: "none"` 이라
 * 아무 일도 일어나지 않는다 — 기기가 하는 동작과 겹치면 두 번 움직이는 것처럼 보인다.
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

/**
 * 화면 본문.
 *
 * 탭바가 없으니 아래 여백은 홈 인디케이터만큼만 둔다.
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
  return (
    <PageTransition>
      <main className={cn("app-main", wide ? "px-4" : "px-5", className)}>{children}</main>
    </PageTransition>
  );
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
