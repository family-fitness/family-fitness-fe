import type { ReactNode } from "react";

import { ActivityRings, type RingValue } from "@/components/ui/activity-rings";
import type { DayLog } from "@/lib/api/types";
import { dayRings, daySummary, type DaySummary } from "@/lib/day";

/**
 * 하루의 링 셋 — 움직인 시간 · 끝낸 운동 · 칭찬. 하루 기록 · 요일 줄 · 최근 기록이 같이 쓴다.
 * 같은 날을 화면마다 다르게 그리지 않게 셈과 색을 한곳에 둔다.
 */
const RING = {
  time: { color: "var(--color-signal)", track: "var(--color-signal-soft)" },
  work: { color: "var(--color-mark)", track: "var(--color-mark-soft)" },
  praise: { color: "var(--color-signal-deep)", track: "var(--color-deep-soft)" },
} as const;

export function ringsOf(s: DaySummary): RingValue[] {
  const [time, work, praise] = dayRings(s);
  return [
    { label: "움직인 시간", value: time, max: 1, text: `${s.moved}분`, ...RING.time },
    { label: "끝낸 운동", value: work, max: 1, text: `${s.done}개`, ...RING.work },
    { label: "칭찬", value: praise, max: 1, text: `${s.stickers}장`, ...RING.praise },
  ];
}

export function DayRings({
  log,
  size,
  stroke,
  gap,
  center,
  className,
}: {
  log: DayLog | null | undefined;
  size: number;
  stroke: number;
  gap: number;
  /** 링 가운데 — 받은 스티커 */
  center?: ReactNode;
  className?: string;
}) {
  return (
    <ActivityRings
      legend={false}
      size={size}
      stroke={stroke}
      gap={gap}
      rings={ringsOf(daySummary(log))}
      center={center}
      className={className}
    />
  );
}
