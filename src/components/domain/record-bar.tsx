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
 *
 * `percentile` 이 null 인 경우가 실제로 있다 — 만 7~10세는 국민체력100 규준이
 * 비어 있는 항목이 있다. 그때는 0% 막대를 그리지 않는다. 0등으로 보인다.
 */
export function RecordBar({
  percentile,
  label,
  className,
  delay = 0,
}: {
  percentile: number | null | undefined;
  /** 스크린리더용 설명. 서버 문구를 그대로 넘긴다 */
  label?: string | null;
  className?: string;
  delay?: number;
}) {
  if (percentile == null) {
    return (
      <div className={cn("record-rail", className)} role="img" aria-label="비교 기준 없음">
        <span className="record-dash" aria-hidden />
      </div>
    );
  }

  return (
    <div className={cn("record-rail", className)} role="img" aria-label={label ?? undefined}>
      <span
        className="record-fill fill"
        style={{ width: `${percentile}%`, animationDelay: `${delay}s` }}
        aria-hidden
      />
      <span className="record-avg" aria-hidden />
    </div>
  );
}

/**
 * 라벨 · 값 · 막대를 한 묶음으로. 결과 화면에서 항목마다 쓴다.
 *
 * 설명 문구(`caption`)는 **서버가 준 것을 그대로 쓴다.** 백분위에서 "상위 N%" 를
 * 프론트가 다시 계산하면 반올림 기준이 서버와 달라져 두 화면이 다른 말을 한다.
 */
export function RecordRow({
  label,
  value,
  percentile,
  caption,
  delay = 0,
}: {
  label: string;
  value: string;
  percentile: number | null | undefined;
  caption?: string | null;
  delay?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="tabular text-ink-soft text-sm">{value}</span>
      </div>
      <RecordBar percentile={percentile} label={caption} delay={delay} />
      <p className="text-faint text-[0.7rem]">{caption ?? "이 나이대는 아직 비교 기준이 없어요"}</p>
    </div>
  );
}
