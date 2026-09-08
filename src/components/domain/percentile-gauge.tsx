"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * 세로 눈금 — 이 서비스의 시각적 중심.
 *
 * 백분위 · 등급 · 예측 곡선이 전부 "축 위의 어디"다. 그걸 카드마다 숫자로 흩어놓는 대신
 * 하나의 눈금 위에 가족을 같이 세운다. 문설주에 아이 키를 표시하던 것과 같은 형태이고,
 * 서비스 이름("체력키움")과도 붙는다.
 *
 * 규칙
 *   - 등급을 색으로 낙인찍지 않는다. 점은 전부 같은 색이고 위치만 다르다
 *   - 50 백분위(또래 평균) 선을 항상 그린다. 기준선이 없으면 위치가 뜻을 잃는다
 *   - 측정이 없는 사람은 눈금에 올리지 않고 아래에 따로 적는다
 */
export interface GaugeMark {
  id: string;
  label: string;
  percentile: number;
  /** 지금 보고 있는 사람. 하나만 강조한다 */
  highlighted?: boolean;
}

export function PercentileGauge({
  marks,
  className,
  height = 240,
}: {
  marks: GaugeMark[];
  className?: string;
  height?: number;
}) {
  const ticks = [100, 75, 50, 25, 0];

  // 같은 높이에 겹치면 이름이 읽히지 않는다. 가까운 것끼리 좌우로 벌린다
  const sorted = [...marks].sort((a, b) => b.percentile - a.percentile);
  const lanes = sorted.map((mark, index) => {
    const previous = sorted[index - 1];
    return previous && Math.abs(previous.percentile - mark.percentile) < 12 ? 1 : 0;
  });

  return (
    <div className={cn("relative", className)} style={{ height }}>
      {/* 눈금선과 숫자 */}
      {ticks.map((tick) => (
        <div
          key={tick}
          className="absolute inset-x-0 flex items-center gap-2"
          style={{ top: `${100 - tick}%` }}
        >
          <span className="tabular text-faint w-7 text-right text-[0.65rem]">{tick}</span>
          <span
            className={cn(
              "h-px flex-1",
              // 또래 평균선은 진하게. 나머지는 옅게
              tick === 50 ? "bg-line" : "bg-line/50",
            )}
          />
          {tick === 50 && <span className="text-faint text-[0.65rem]">또래 평균</span>}
        </div>
      ))}

      {/* 구성원 위치 */}
      {sorted.map((mark, index) => (
        <motion.div
          key={mark.id}
          className="absolute flex items-center gap-1.5"
          style={{ top: `${100 - mark.percentile}%`, left: `${2.75 + lanes[index] * 5.5}rem` }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 * index, type: "spring", damping: 20 }}
        >
          <span
            className={cn(
              "size-2.5 -translate-y-1/2 rounded-full",
              mark.highlighted ? "bg-mark ring-mark-soft ring-4" : "bg-grow",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "-translate-y-1/2 text-xs whitespace-nowrap",
              mark.highlighted ? "text-mark font-semibold" : "text-ink",
            )}
          >
            {mark.label}
          </span>
          <span className="tabular text-faint -translate-y-1/2 text-[0.65rem]">
            {mark.percentile}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * 가로 막대형 백분위. 항목별 결과처럼 여러 개를 나란히 놓을 때 쓴다.
 * 세로 눈금은 가족 전체를 한 축에 놓을 때만 쓴다.
 */
export function PercentileBar({
  percentile,
  label,
  value,
}: {
  percentile: number;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular text-mute">{value}</span>
      </div>
      <div className="bg-line relative h-2 overflow-hidden rounded-full">
        <motion.span
          className="bg-grow absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentile}%` }}
          transition={{ type: "spring", damping: 26, stiffness: 160 }}
        />
        {/* 또래 평균 위치 */}
        <span className="bg-surface absolute inset-y-0 left-1/2 w-px" aria-hidden />
      </div>
      <p className="tabular text-faint text-xs">상위 {Math.max(1, 100 - percentile)}%</p>
    </div>
  );
}
