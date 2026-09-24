import type { ReactNode } from "react";

import { ActivityRings, type RingValue } from "@/components/ui/activity-rings";
import type { DayLog } from "@/lib/api/types";
import { dayRings, daySummary, type DaySummary } from "@/lib/day";

/**
 * 하루의 링 둘 — 움직인 시간 · 끝낸 운동. 하루 기록 · 요일 줄 · 최근 기록 · 캘린더 날 칸이 같이 쓴다.
 * 같은 날을 화면마다 다르게 그리지 않게 셈과 색을 한곳에 둔다.
 * 칭찬은 링이 아니다 — 받은 스티커는 링 가운데에 얹는다(규칙 12).
 */
const RING = {
  time: { color: "var(--color-signal)", track: "var(--color-signal-soft)" },
  work: { color: "var(--color-mark)", track: "var(--color-mark-soft)" },
} as const;

export function ringsOf(s: DaySummary): RingValue[] {
  const [time, work] = dayRings(s);
  return [
    { label: "움직인 시간", value: time, max: 1, text: `${s.moved}분`, ...RING.time },
    { label: "끝낸 운동", value: work, max: 1, text: `${s.done}개`, ...RING.work },
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
