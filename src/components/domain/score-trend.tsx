"use client";

import { useState } from "react";

import type { FitnessTestSummary } from "@/lib/api/types";

/*
  신체 점수 흐름. 측정 회차마다 점 하나.

  또래 평균 50 을 회색 선으로 늘 같이 그린다(규칙 10). 점수만 이어 그리면 오른쪽으로
  올라가는지만 보이고 그게 또래 대비 어디인지가 안 보인다. 선이 무엇인지는 범례가 글로 말한다.
  숫자는 점마다 적는다 — 눌러야 나오는 값은 부모가 안 누른다. 많아지면 처음 · 끝 · 가장 높고 낮은 것만.
*/

const W = 320;
const H = 150;
const PAD = { l: 14, r: 14, t: 26, b: 26 };
/** 이보다 많으면 숫자를 다 적지 않는다 — 글자끼리 부딪힌다 */
const LABEL_ALL = 6;

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
  /** 숫자는 점 위에. 위에 두면 평균 선에 걸리는 점(평균 조금 아래)만 점 아래로 */
  const labelY = (v: number) => {
    const gap = y(v) - y(50);
    return gap > 8 && gap < 24 ? y(v) + 19 : y(v) - 11;
  };
  const shown = active != null ? points[active] : null;
  const labeled = new Set(
    points.length <= LABEL_ALL
      ? points.map((_, i) => i)
      : [
          0,
          points.length - 1,
          values.indexOf(Math.max(...values)),
          values.indexOf(Math.min(...values)),
        ],
  );

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="group"
          aria-label={`신체 점수 흐름. ${points.map((p) => `${month(p.testedOn)} ${p.overallPercentile}`).join(", ")}. 또래 평균 50`}
        >
          {/* 눈금 — 위아래 끝은 옅게, 50 은 또래 평균이라 진하게 */}
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
              // 단추라면 엔터 · 스페이스로도 눌린다. 마우스를 올려 바뀌는 모양은 두지 않는다(폰에서는 누른 뒤에도 남는다)
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                setActive((cur) => (cur === i ? null : i));
              }}
              // 키보드로 옮겨 왔을 때만 초점으로 연다 — 손가락으로 누르면 초점이 먼저 열고 누름이 바로 닫아
              // 처음 누른 점은 아무것도 안 떴다
              onFocus={(e) => {
                if (e.currentTarget.matches(":focus-visible")) setActive(i);
              }}
              onBlur={() => setActive(null)}
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
              {labeled.has(i) && (
                <text
                  x={x(i)}
                  y={labelY(p.overallPercentile)}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={800}
                  className="fill-ink"
                >
                  {p.overallPercentile}
                </text>
              )}
            </g>
          ))}
        </svg>
        {shown && active != null && (
          <div
            role="status"
            className="bg-signal-deep pointer-events-none absolute z-10 w-max rounded-xl px-3 py-1.5 text-white"
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

      <ul className="text-caption text-ink-soft mt-1 flex items-center justify-center gap-4 font-semibold">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="bg-signal relative h-0.5 w-4 rounded-full">
            <span className="bg-signal absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full" />
          </span>
          신체 점수
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="bg-baseline h-0.5 w-4 rounded-full" />
          또래 평균 50
        </li>
      </ul>
    </div>
  );
}
