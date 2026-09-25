"use client";

import { cn } from "@/lib/utils";

/** 기록 막대. */
function RecordBar({
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
      {/*
        「기준이 없다」 는 백분위가 비었을 때만 말한다. 아이 화면은 서열 문구(caption)를
        일부러 빼는데, 그걸 빈 기준으로 읽어 막대 밑에 거짓말을 적고 있었다.
      */}
      {percentile == null ? (
        <p className="text-ink-soft text-caption">이 나이대는 아직 비교 기준이 없어요</p>
      ) : (
        caption && <p className="text-ink-soft text-caption">{caption}</p>
      )}
    </div>
  );
}
