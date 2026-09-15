"use client";

import { useId } from "react";

import type { RadarPoint } from "@/lib/api/types";

/**
 * 체력 요인 레이더.
 *
 * 서버가 주는 `radar` 는 5요인(근력 · 근지구력 · 유연성 · 심폐지구력 · 순발력)이고
 * 요인에 항목이 여럿이면 평균이 이미 계산돼 온다. 프론트는 그리기만 한다.
 *
 * 차트 라이브러리를 쓰지 않고 직접 그린다. 축이 다섯 개뿐이라 수식이 짧고,
 * 라이브러리 기본 스타일(회색 격자 · 기본 폰트)이 그대로 나오면
 * 어느 앱에나 있는 차트처럼 보인다.
 *
 * **50 눈금을 항상 그린다.** 또래 평균이 어디인지 없으면 70이 좋은 값인지 알 수 없다.
 * 규준이 없는 요인(percentile null)은 0으로 찍지 않는다 — 꼴찌로 보인다.
 */
export function FactorRadar({
  points,
  size = 240,
}: {
  points: RadarPoint[];
  /** 정사각 변 길이(px) */
  size?: number;
}) {
  const clipId = useId();
  const n = points.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  // 축 이름이 바깥에 들어갈 자리를 남긴다
  const r = size / 2 - 34;

  /** 백분위(0~100) 를 화면 좌표로. 12시부터 시계방향 */
  const at = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const radius = (r * value) / 100;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
  };

  const ring = (value: number) => points.map((_, i) => at(i, value).join(",")).join(" ");

  const measured = points.filter((p) => p.percentile != null);
  const hasGap = measured.length < n;

  // 규준이 없는 요인은 다각형을 잇지 않고 점만 남긴다
  const shape =
    measured.length >= 3
      ? points
          .map((p, i) => (p.percentile == null ? null : at(i, p.percentile).join(",")))
          .filter(Boolean)
          .join(" ")
      : "";

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`체력 요인별 또래 백분위. ${points
          .map((p) => `${p.factor} ${p.percentile == null ? "기준 없음" : `${p.percentile}`}`)
          .join(", ")}`}
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={ring(100)} />
          </clipPath>
        </defs>

        {/* 바깥 테두리와 눈금. 25 · 75 는 흐리게, 50 은 또래 평균이라 실선 */}
        {[25, 75, 100].map((v) => (
          <polygon
            key={v}
            points={ring(v)}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}
        <polygon
          points={ring(50)}
          fill="none"
          stroke="var(--color-ink-soft)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* 축 */}
        {points.map((p, i) => {
          const [x, y] = at(i, 100);
          return (
            <line
              key={p.factor}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          );
        })}

        {shape && (
          <polygon
            points={shape}
            fill="var(--color-signal)"
            fillOpacity={0.16}
            stroke="var(--color-signal)"
            strokeWidth={2}
            strokeLinejoin="round"
            clipPath={`url(#${clipId})`}
          />
        )}

        {points.map((p, i) => {
          if (p.percentile == null) return null;
          const [x, y] = at(i, p.percentile);
          return (
            <circle
              key={p.factor}
              cx={x}
              cy={y}
              r={3.5}
              fill="var(--color-paper)"
              stroke="var(--color-signal)"
              strokeWidth={2}
            />
          );
        })}

        {/* 축 이름 */}
        {points.map((p, i) => {
          const [x, y] = at(i, 122);
          const anchor = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
          return (
            <text
              key={p.factor}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-ink-soft text-[0.68rem] font-bold"
            >
              {p.factor}
            </text>
          );
        })}
      </svg>

      <p className="text-faint mt-1 text-[0.68rem]">
        점선이 또래 평균이에요{hasGap && " · 기준이 없는 요인은 비워 뒀어요"}
      </p>
    </div>
  );
}
