import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-surface p-4", className)} {...props} />;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  // 제목 앞에 세로 막대를 붙이지 않는다 (AGENTS.md)
  return <h2 className={cn("text-base font-semibold", className)}>{children}</h2>;
}

export function CardHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-mute text-sm", className)}>{children}</p>;
}

/** 화면 안의 구획. 제목 + 내용 묶음 */
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
    <section className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
