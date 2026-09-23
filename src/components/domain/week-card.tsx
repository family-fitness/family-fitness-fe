import { Card, CardHead } from "@/components/ui/card";
import { MiniBars } from "@/components/ui/mini-bars";
import type { DayLog } from "@/lib/api/types";
import { today, weekdayOf } from "@/lib/today";

/**
 * 이번 주 움직인 시간. 월~일 막대 일곱 칸.
 *
 * 빈 날을 「빠진 날」 이라고 쓰지 않는다. 움직인 날 수만 센다 — 쉰 날은 셀 것이 아니다.
 * 카드 전체가 캘린더로 가는 길이다.
 */
export function WeekCard({
  days,
  logs,
  href,
}: {
  /** 이번 주 날짜 일곱 개 (월~일) */
  days: string[];
  logs: DayLog[] | undefined;
  href: string;
}) {
  const byDate = new Map((logs ?? []).map((l) => [l.date, l]));
  const values = days.map((d) => byDate.get(d)?.minutes ?? 0);
  const total = values.reduce((a, b) => a + b, 0);
  const active = values.filter((v) => v > 0).length;
  const now = today();

  return (
    <Card href={href} label={`이번 주 ${total}분, ${active}일 움직였어요. 캘린더 보기`}>
      <CardHead title="이번 주" chevron />
      <div className="mt-1 flex items-end justify-between gap-4">
        <div className="shrink-0">
          <p className="metric-value text-metric">
            {total}
            <span className="metric-unit">분</span>
          </p>
          <p className="text-caption text-ink-soft mt-1 font-semibold">{active}일 움직였어요</p>
        </div>
        <MiniBars
          values={values}
          labels={days.map(weekdayOf)}
          highlight={days.indexOf(now)}
          className="max-w-44"
        />
      </div>
    </Card>
  );
}
