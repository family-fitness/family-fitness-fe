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
 * 배경에 국민체력100 5등급 밴드를 깐다. 장식이 아니라 두 가지 일을 한다.
 *   1. 백분위는 가운데로 몰리는 값이라, 밴드가 없으면 축의 위아래가 늘 텅 빈다
 *   2. 점이 어느 등급 구간에 있는지를 숫자 없이 읽게 해 준다
 *
 * 규칙
 *   - 등급을 색으로 낙인찍지 않는다. 밴드는 같은 초록 계열의 명도 단계다
 *   - 점은 전부 같은 색이고 위치만 다르다
 *   - 또래 평균(50 백분위) 선을 항상 그린다. 기준선이 없으면 위치가 뜻을 잃는다
 */
export interface GaugeMark {
  id: string;
  label: string;
  percentile: number;
  /** 지금 보고 있는 사람. 하나만 강조한다 */
  highlighted?: boolean;
}

/** 국민체력100 등급 구간. 위에서부터 1등급 */
const BANDS = [
  { grade: 1, from: 80, to: 100, className: "bg-grow/16" },
  { grade: 2, from: 60, to: 80, className: "bg-grow/12" },
  { grade: 3, from: 40, to: 60, className: "bg-grow/8" },
  { grade: 4, from: 20, to: 40, className: "bg-grow/5" },
  { grade: 5, from: 0, to: 20, className: "bg-grow/3" },
] as const;

export function PercentileGauge({
  marks,
  className,
  height = 200,
}: {
  marks: GaugeMark[];
  className?: string;
  height?: number;
}) {
  // 같은 높이에 겹치면 이름이 읽히지 않는다. 가까운 것끼리 좌우로 벌린다
  const sorted = [...marks].sort((a, b) => b.percentile - a.percentile);
  const lanes: number[] = [];
  sorted.forEach((mark, index) => {
    const previous = sorted[index - 1];
    const prevLane = lanes[index - 1] ?? 0;
    lanes.push(previous && Math.abs(previous.percentile - mark.percentile) < 10 ? prevLane + 1 : 0);
  });

  // 눈금은 눈으로 읽는 그림이다. 화면 낭독기에는 같은 내용을 문장으로 준다
  const description =
    sorted.length === 0
      ? "측정 기록이 없습니다."
      : sorted
          .map((m) => `${m.label} 또래 중 상위 ${Math.max(1, 100 - m.percentile)} 퍼센트`)
          .join(", ");

  return (
    <div
      className={cn("relative", className)}
      style={{ height }}
      role="img"
      aria-label={`또래 대비 위치. ${description}`}
    >
      {/* 등급 밴드. 축 숫자를 따로 두지 않는 이유는 밴드가 같은 정보를 이미 주기 때문이다 */}
      <div className="absolute inset-0 overflow-hidden rounded-lg" aria-hidden>
        {BANDS.map((band) => (
          <div
            key={band.grade}
            className={cn("absolute inset-x-0", band.className)}
            style={{ top: `${100 - band.to}%`, height: `${band.to - band.from}%` }}
          >
            <span className="tabular text-faint absolute top-1 right-2 text-[0.6rem]">
              {band.grade}등급
            </span>
          </div>
        ))}
      </div>

      {/* 또래 평균선. 라벨은 등급 라벨과 부딪히지 않게 왼쪽에 둔다 */}
      <div
        className="absolute inset-x-0 flex items-center gap-1.5"
        style={{ top: "50%" }}
        aria-hidden
      >
        <span className="text-mute pl-2 text-[0.6rem] whitespace-nowrap">또래 평균</span>
        <span className="bg-mute/40 h-px flex-1" />
      </div>

      {/* 구성원 위치 */}
      {sorted.map((mark, index) => (
        <motion.div
          key={mark.id}
          className="absolute flex -translate-y-1/2 items-center gap-1.5"
          style={{ top: `${100 - mark.percentile}%`, left: `${0.5 + lanes[index] * 5.75}rem` }}
          aria-hidden
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.04 * index, type: "spring", damping: 22 }}
        >
          <span
            className={cn(
              "size-2.5 rounded-full",
              mark.highlighted ? "bg-mark ring-mark-soft ring-4" : "bg-grow",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "text-xs whitespace-nowrap",
              mark.highlighted ? "text-mark font-semibold" : "text-ink font-medium",
            )}
          >
            {mark.label}
          </span>
          <span className="tabular text-faint text-[0.65rem]">{mark.percentile}</span>
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
      <div
        className="bg-line relative h-2 overflow-hidden rounded-full"
        role="img"
        aria-label={`또래 중 상위 ${Math.max(1, 100 - percentile)} 퍼센트`}
      >
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
