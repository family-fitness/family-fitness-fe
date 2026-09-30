"use client";

import { useEffect, useRef } from "react";

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
  const fill = useRef<HTMLSpanElement>(null);
  /*
    보일 때 자란다 — 아래 칸이 아무도 안 보는 사이에 다 자라 버렸다. 처음부터 보이는 막대는 받은 차례(delay)대로,
    굴려서 만나는 막대는 바로
  */
  useEffect(() => {
    const el = fill.current;
    if (!el) return;
    const born = performance.now();
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      if (performance.now() - born > 600) el.style.animationDelay = "0s";
      el.dataset.seen = "";
      io.disconnect();
    });
    // 막대 자리(레일)를 본다 — 자라기 전의 막대는 폭이 0 이다. 자리가 잡힌 뒤에 보기 시작한다 —
    // 그리자마자 보면 아직 위가 덜 서서 화면 밖이 될 막대도 보인다고 잡혔다(멈춘 동안은 차례도 흐르지 않는다)
    const start = setTimeout(() => io.observe(el.parentElement ?? el), 250);
    return () => {
      clearTimeout(start);
      io.disconnect();
    };
  }, []);

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
        ref={fill}
        data-wait=""
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
      {/* 비교 기준이 없는 나이면 빗금 막대가 말한다 — 풀이 줄을 달지 않는다 */}
      <RecordBar percentile={percentile} label={caption} delay={delay} />
      {percentile != null && caption && <p className="text-ink-soft text-caption">{caption}</p>}
    </div>
  );
}
