import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 이 숫자 · 이 운동이 어디서 왔는지 — 국민체력100 공공데이터.
 * 공공데이터 활용 공모전이라 출처가 화면에서 보여야 한다. 그래프 · 편성 아래에 한 줄로.
 */
export function SourceTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex justify-center", className)}>
      <span className="bg-signal-soft text-signal-deep text-micro inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-extrabold">
        <span aria-hidden className="bg-signal-deep size-1.5 rounded-full" />
        {children}
      </span>
    </p>
  );
}
