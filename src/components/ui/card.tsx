import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 안의 구획.
 *
 * 제목 옆으로 선을 뻗어 구획을 나눈다. 배경을 깔거나 테두리를 두르지 않는다 —
 * 흰 배경 위에 흰 상자를 얹으면 테두리만 늘어난다.
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-1", className)}>
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
