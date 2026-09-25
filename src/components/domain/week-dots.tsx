import type { DayLog } from "@/lib/api/types";
import { today } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 이번 주 월~일 점 일곱 — 움직인 날만 채운다. 부모 홈의 아이 줄과 가족 대시보드의 사람 줄이 같이 쓴다.
 *
 * 쉬는 날 카드를 쓴 날은 노랑 테 — 빠진 날처럼 칠하지 않는다(규칙 15). 캘린더의 쉬는 날과 같은 노랑이다.
 * 기록이 없으면 빈 점 일곱을 세우지 않는다 — 한 주를 통째로 쉰 것처럼 읽혔다. 받는 중(undefined)이면 뼈대,
 * 못 받았으면(null) 점을 두지 않는다 — 뼈대가 영영 숨 쉬면 기다리는 것처럼 보인다
 */
export function WeekDots({ days, logs }: { days: string[]; logs: DayLog[] | null | undefined }) {
  if (logs === null) return null;
  if (!logs) {
    return (
      <span className="mt-1.5 flex gap-1" aria-hidden>
        {days.map((d) => (
          <span key={d} className="skeleton size-2.5 rounded-full" />
        ))}
      </span>
    );
  }
  const now = today();
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const moved = days.filter((d) => (byDate.get(d)?.minutes ?? 0) > 0).length;
  return (
    <span className="mt-1.5 flex gap-1" role="img" aria-label={`이번 주 ${moved}일 움직였어요`}>
      {days.map((d) => {
        const log = byDate.get(d);
        const on = (log?.minutes ?? 0) > 0;
        const rest = !on && Boolean(log?.rest);
        return (
          <span
            key={d}
            className={cn(
              "size-2.5 rounded-full",
              on ? "bg-signal" : rest ? "bg-mark-soft ring-mark ring-1 ring-inset" : "bg-sub",
              d === now && !on && !rest && "ring-signal ring-1",
            )}
          />
        );
      })}
    </span>
  );
}
