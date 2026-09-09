"use client";

import { cn } from "@/lib/utils";

/**
 * 기록 막대.
 *
 * 백분위는 "또래 100명 중 내 자리"다. 그래서 막대에 항상 또래 평균(50) 눈금을 둔다.
 * 기준이 없으면 60이 좋은 건지 나쁜 건지 알 수 없다.
 *
 * 색은 하나만 쓴다. 낮은 값을 빨강으로 칠하면 아이가 자기 화면에서
 * 자기가 나쁘다는 신호를 본다.
 */
export function RecordBar({
  percentile,
  className,
  delay = 0,
}: {
  percentile: number;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("record-rail", className)}
      role="img"
      aria-label={`또래 중 상위 ${Math.max(1, 100 - percentile)} 퍼센트`}
    >
      <span
        className="record-fill fill"
        style={{ width: `${percentile}%`, animationDelay: `${delay}s` }}
        aria-hidden
      />
      <span className="record-avg" aria-hidden />
    </div>
  );
}

/** 라벨 · 값 · 막대를 한 묶음으로. 결과 화면에서 항목마다 쓴다 */
export function RecordRow({
  label,
  value,
  percentile,
  delay = 0,
}: {
  label: string;
  value: string;
  percentile: number;
  delay?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="tabular text-ink-soft text-sm">{value}</span>
      </div>
      <RecordBar percentile={percentile} delay={delay} />
      <p className="text-faint text-[0.7rem]">또래 중 상위 {Math.max(1, 100 - percentile)}%</p>
    </div>
  );
}
