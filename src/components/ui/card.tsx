import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-4", className)} {...props} />;
}

/** 화면 안의 구획. 제목 앞에 세로 막대를 붙이지 않는다 */
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
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.95rem] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
