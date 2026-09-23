"use client";

import { useState } from "react";

import type { FitnessTestSummary } from "@/lib/api/types";

/*
  신체 점수 흐름. 측정 회차마다 점 하나.

  또래 평균 50 을 회색 선으로 늘 같이 그린다(규칙 10). 점수만 이어 그리면 오른쪽으로
  올라가는지만 보이고 그게 또래 대비 어디인지가 안 보인다.
  숫자는 마지막 점에만 적는다. 나머지는 눌러서 본다.
*/

const W = 320;
const H = 150;
const PAD = { l: 10, r: 30, t: 18, b: 26 };

export function ScoreTrend({ tests }: { tests: FitnessTestSummary[] }) {
  const points = tests
    .filter(
      (t): t is FitnessTestSummary & { overallPercentile: number } => t.overallPercentile != null,
    )
    .sort((a, b) => a.testedOn.localeCompare(b.testedOn));
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) return null;

  const x = (i: number) =>
    points.length === 1
      ? (PAD.l + W - PAD.r) / 2
      : PAD.l + ((W - PAD.l - PAD.r) * i) / (points.length - 1);
  /*
    세로 범위는 값 주변으로 좁힌다. 0~100 을 다 쓰면 44 → 55 가 평평한 선이 되어
    자라고 있다는 게 안 보인다. 선 그래프라 0에서 시작할 필요가 없다 — 대신
    기준선 50 은 늘 범위 안에 둔다.
  */
  const values = points.map((p) => p.overallPercentile);
  const lo = Math.max(0, Math.min(...values, 50) - 12);
  const hi = Math.min(100, Math.max(...values, 50) + 12);
  const y = (v: number) => PAD.t + ((H - PAD.t - PAD.b) * (hi - v)) / (hi - lo);
  const month = (d: string) => `${Number(d.slice(5, 7))}월`;
  const last = points[points.length - 1];
  const shown = active != null ? points[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="group"
        aria-label={`신체 점수 흐름. ${points.map((p) => `${month(p.testedOn)} ${p.overallPercentile}`).join(", ")}. 또래 평균 50`}
      >
        {/* 눈금 — 위아래 끝은 옅게, 50 은 또래 평균이라 한 계열로 */}
        {[lo, hi].map((v) => (
          <line
            key={v}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={y(50)}
          y2={y(50)}
          stroke="var(--color-baseline)"
          strokeWidth={1.5}
        />
        <text
          x={W - PAD.r + 4}
          y={y(50) + 4}
          fontSize={10}
          fontWeight={700}
          className="fill-ink-soft"
        >
          평균
        </text>

        {points.length > 1 && (
          <polyline
            points={points.map((p, i) => `${x(i)},${y(p.overallPercentile)}`).join(" ")}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {points.map((p, i) => (
          <g
            key={p.fitnessTestId}
            role="button"
            tabIndex={0}
            aria-label={`${month(p.testedOn)} ${p.overallPercentile}점`}
            onClick={() => setActive((cur) => (cur === i ? null : i))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            className="cursor-pointer"
          >
            {/* 누르는 자리는 점보다 넓게 */}
            <circle cx={x(i)} cy={y(p.overallPercentile)} r={14} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.overallPercentile)}
              r={active === i ? 6 : 4.5}
              fill="var(--color-signal)"
              stroke="var(--color-paper)"
              strokeWidth={2}
            />
            <text
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              className="fill-ink-soft"
            >
              {month(p.testedOn)}
            </text>
          </g>
        ))}

        {/* 마지막 점에만 숫자 */}
        <text
          x={x(points.length - 1)}
          y={y(last.overallPercentile) - 10}
          textAnchor="middle"
          fontSize={12}
          fontWeight={800}
          className="fill-ink"
        >
          {last.overallPercentile}
        </text>
      </svg>

      {shown && active != null && (
        <div
          role="status"
          className="bg-ink pointer-events-none absolute z-10 w-max rounded-xl px-3 py-1.5 text-white"
          style={{
            left: `${(x(active) / W) * 100}%`,
            top: `${(y(shown.overallPercentile) / H) * 100}%`,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <p className="text-caption font-bold">
            {Number(shown.testedOn.slice(5, 7))}월 {Number(shown.testedOn.slice(8, 10))}일 ·{" "}
            {shown.overallPercentile}점
          </p>
        </div>
      )}
    </div>
  );
}
