"use client";

import { cn } from "@/lib/utils";

/** 기록 막대. */
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

/** 라벨 · 값 · 막대를 한 묶음으로. 결과 화면에서 항목마다 쓴다. */
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
      <p className="text-faint text-caption">{caption ?? "이 나이대는 아직 비교 기준이 없어요"}</p>
    </div>
  );
}
