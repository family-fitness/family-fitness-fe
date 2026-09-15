"use client";

import { useId } from "react";

import type { PredictionPoint } from "@/lib/api/types";

/**
 * 10년 뒤 분포.
 *
 * **중앙값만 그리면 확정된 미래처럼 보인다.** 그래서 p10~p90 음영을 반드시 같이
 * 그린다. 넓은 띠가 "이만큼 폭이 있다" 는 말을 글보다 잘 한다.
 *
 * 국민체력100 은 횡단면 조사다 — 같은 사람을 10년 따라간 자료가 아니라,
 * 지금 10년 위 연령대가 어디 있는지를 본 것이다. 이 그림은 그 분포다.
 */
export function TrajectoryChart({
  points,
  unit,
  width = 320,
  height = 200,
}: {
  points: PredictionPoint[];
  unit?: string;
  width?: number;
  height?: number;
}) {
  const bandId = useId();
  const usable = points
    .filter((p) => p.p50 != null)
    .sort((a, b) => (a.yearsFromNow ?? 0) - (b.yearsFromNow ?? 0));

  if (usable.length < 2) return null;

  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const years = usable.map((p) => p.yearsFromNow ?? 0);
  const values = usable.flatMap((p) => [p.p10, p.p50, p.p90].filter((v): v is number => v != null));

  const maxYear = Math.max(...years);
  const minYear = Math.min(...years);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // 위아래로 한 뼘 띄운다. 띠가 그림 가장자리에 붙으면 잘린 것처럼 보인다
  const pad = (hi - lo) * 0.15 || 1;

  const x = (year: number) =>
    padding.left + (plotW * (year - minYear)) / Math.max(1, maxYear - minYear);
  const y = (value: number) =>
    padding.top + plotH - (plotH * (value - (lo - pad))) / (hi + pad - (lo - pad));

  const line = (key: "p10" | "p50" | "p90") =>
    usable
      .filter((p) => p[key] != null)
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.yearsFromNow ?? 0)},${y(p[key] as number)}`)
      .join(" ");

  // 위쪽 경계를 따라가고 아래쪽 경계를 거꾸로 돌아와 닫는다
  const band = [
    ...usable.filter((p) => p.p90 != null).map((p) => `${x(p.yearsFromNow ?? 0)},${y(p.p90!)}`),
    ...[...usable]
      .reverse()
      .filter((p) => p.p10 != null)
      .map((p) => `${x(p.yearsFromNow ?? 0)},${y(p.p10!)}`),
  ].join(" ");

  const first = usable[0];
  const last = usable[usable.length - 1];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`지금 ${first.p50}${unit ?? ""}, ${last.yearsFromNow}년 위 연령대는 ${last.p10}에서 ${last.p90}${unit ?? ""} 사이에 있습니다`}
      >
        <defs>
          <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* 가로 눈금 */}
        {[lo - pad, (lo + hi) / 2, hi + pad].map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              y1={y(v)}
              x2={width - padding.right}
              y2={y(v)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={padding.left - 6}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-faint text-[0.6rem] tabular-nums"
            >
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* p10~p90 띠. 이게 이 그림의 핵심이다 */}
        <polygon points={band} fill={`url(#${bandId})`} />
        <path
          d={line("p10")}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.6}
        />
        <path
          d={line("p90")}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.6}
        />
        <path
          d={line("p50")}
          fill="none"
          stroke="var(--color-signal-deep)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {usable.map((p) => (
          <circle
            key={p.yearsFromNow}
            cx={x(p.yearsFromNow ?? 0)}
            cy={y(p.p50 as number)}
            r={3}
            fill="var(--color-paper)"
            stroke="var(--color-signal-deep)"
            strokeWidth={2}
          />
        ))}

        {/* 가로축 — 지금과 끝만 적는다 */}
        <text
          x={padding.left}
          y={height - 8}
          textAnchor="start"
          className="fill-ink-soft text-[0.62rem] font-bold"
        >
          지금
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="fill-ink-soft text-[0.62rem] font-bold"
        >
          {maxYear}년 위 연령대
        </text>
      </svg>

      <figcaption className="text-faint mt-1 text-[0.68rem] leading-relaxed">
        진한 선이 가운데(50%), 옅은 띠가 열에 여덟이 들어가는 범위(10~90%) 예요.
      </figcaption>
    </figure>
  );
}
