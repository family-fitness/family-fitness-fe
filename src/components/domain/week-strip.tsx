import { Check } from "lucide-react";

import type { DayLog } from "@/lib/api/types";
import { today, weekdayOf } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 이번 주 일곱 칸 — 아이 화면용.
 *
 * 움직인 날은 파랑 동그라미에 체크, 오늘은 테두리, 아직 오지 않은 날은 흐리게.
 * **빈 날에 표시를 하지 않는다.** 빠진 날이 눈에 띄게 그리면 그게 벌이 된다.
 */
export function WeekStrip({ days, logs }: { days: string[]; logs: DayLog[] | undefined }) {
  const moved = new Set((logs ?? []).filter((l) => l.minutes > 0).map((l) => l.date));
  const now = today();

  return (
    <ol className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const on = moved.has(d);
        const isToday = d === now;
        const later = d > now;
        return (
          <li key={d} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "text-micro font-bold",
                isToday ? "text-ink" : later ? "text-faint" : "text-ink-soft",
              )}
            >
              {weekdayOf(d)}
            </span>
            <span
              aria-label={`${weekdayOf(d)}요일${on ? " 움직였어요" : ""}`}
              className={cn(
                "grid size-9 place-items-center rounded-full",
                on && "bg-signal text-white",
                !on && isToday && "border-signal border-2",
                !on && !isToday && "bg-sub",
              )}
            >
              {on && <Check aria-hidden className="size-4" strokeWidth={3.2} />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
