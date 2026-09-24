import { Card, CardHead } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekTower } from "@/components/scene/week-tower";
import type { DayLog } from "@/lib/api/types";
import { today } from "@/lib/today";

/**
 * 이번 주 움직인 시간. 월~일 블록 탑 — 요일마다 기둥 하나(키움 섬과 같은 결).
 *
 * 빈 날을 「빠진 날」 이라고 쓰지 않는다. 움직인 날 수만 센다 — 쉰 날은 셀 것이 아니다.
 * 카드 전체가 캘린더로 가는 길이다.
 */
export function WeekCard({
  days,
  logs,
  loading = false,
  href,
}: {
  /** 이번 주 날짜 일곱 개 (월~일) */
  days: string[];
  logs: DayLog[] | undefined;
  /** 기록을 받는 중 — 탑은 받은 뒤에 짓는다(0분으로 먼저 지었다 다시 짓지 않게) */
  loading?: boolean;
  href: string;
}) {
  const byDate = new Map((logs ?? []).map((l) => [l.date, l]));
  const values = days.map((d) => byDate.get(d)?.minutes ?? 0);
  const total = values.reduce((a, b) => a + b, 0);
  const active = values.filter((v) => v > 0).length;
  const now = today();

  return (
    <Card href={href} label={`이번 주 ${total}분, ${active}일 운동했어요. 캘린더 보기`}>
      <CardHead title="이번 주" chevron />
      <div className="mt-1 flex items-baseline gap-3">
        <p className="metric-value text-metric">
          {total}
          <span className="metric-unit">분</span>
        </p>
        <p className="text-caption text-ink-soft font-semibold">{active}일 운동했어요</p>
      </div>
      {loading ? (
        <Skeleton className="mt-1 aspect-[320/150] w-full rounded-2xl" />
      ) : (
        <WeekTower days={days} logs={logs} today={now} height={150} className="-mx-1 mt-1" />
      )}
    </Card>
  );
}
