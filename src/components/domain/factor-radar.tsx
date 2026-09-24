"use client";

import { useState, type KeyboardEvent } from "react";

import type { RadarPoint } from "@/lib/api/types";
import {
  FACTOR_NOTE,
  FACTORS,
  measuredCount,
  toHexagon,
  type Factor,
  type FactorPointView,
} from "@/lib/fitness-factors";
import { cn } from "@/lib/utils";

/*
  체력 육각형.

  꼭지점은 **여섯 개 고정**이다(`FACTORS`). 서버가 다섯만 줘도 여섯 자리를 다 그린다 —
  사람마다 축이 달라지면 어제의 나와도, 옆집 아이와도 도형을 견줄 수 없다.

  두 겹을 그린다.
    아이   파랑 선 + 옅은 면. 잰 요인만 점을 찍는다
    또래   회색 선 하나. 백분위 50 자리의 정육각형 — 기준이 없으면 62가 좋은지 모른다

  **안 잰 요인은 0으로 그리지 않는다.** 가운데로 꺾여 들어가면 꼴찌처럼 보인다(규칙 8).
  그 꼭지점은 비워 두고 「안 잰」 이라고 적는다. 잰 두 꼭지점 사이를 건너뛰는 선은
  점선으로 — 모르는 구간을 아는 척하지 않는다.
*/

const W = 320;
const H = 276;
const CX = W / 2;
const CY = H / 2 + 2;
const R = 100;

/** 꼭지점 i 에서 백분위 v 자리. 12시에서 시작해 시계 방향 */
function at(i: number, v: number): readonly [number, number] {
  const a = (Math.PI * 2 * i) / FACTORS.length - Math.PI / 2;
  const r = (R * v) / 100;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

const ring = (v: number) => FACTORS.map((_, i) => at(i, v).join(",")).join(" ");

/** 축 이름 자리. 위·아래는 가운데 정렬, 옆은 도형 바깥으로 */
function labelAt(i: number): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const [x, y] = at(i, 100);
  if (i === 0) return { x, y: y - 14, anchor: "middle" };
  if (i === 3) return { x, y: y + 20, anchor: "middle" };
  return { x: x + (x > CX ? 10 : -10), y: y + (y < CY ? -2 : 6), anchor: x > CX ? "start" : "end" };
}

export function FactorRadar({
  points,
  name,
  focus,
  legend = true,
  className,
}: {
  points: RadarPoint[] | null | undefined;
  /** 파랑 도형이 누구인지. 범례에 쓴다 */
  name: string;
  /** 이 요인의 축만 진하게. AI 편성이 무엇을 키우려는지 보여 줄 때 */
  focus?: Factor | null;
  legend?: boolean;
  className?: string;
}) {
  const hex = toHexagon(points);
  const [active, setActive] = useState<Factor | null>(null);

  const measured = hex
    .map((p, i) => ({ ...p, i }))
    .filter((p): p is FactorPointView & { i: number; percentile: number } => p.percentile != null);

  const vertex = (p: { i: number; percentile: number }) => at(p.i, p.percentile);

  /* 잰 꼭지점을 한 바퀴 돌며 잇는다. 바로 옆이면 실선, 사이에 안 잰 것이 있으면 점선 */
  const edges =
    measured.length >= 2
      ? measured
          .map((p, k) => {
            const next = measured[(k + 1) % measured.length];
            // 둘뿐이면 한 번만 긋는다. 왕복으로 두 번 그으면 선이 겹쳐 진해진다
            if (measured.length === 2 && k === 1) return null;
            const adjacent = (p.i + 1) % FACTORS.length === next.i;
            return { from: vertex(p), to: vertex(next), dashed: !adjacent, key: p.factor };
          })
          .filter((e) => e !== null)
      : [];

  const summary = hex
    .map((p) => `${p.factor} ${p.percentile == null ? "안 잰" : p.percentile}`)
    .join(", ");

  const shown = active ? hex.find((p) => p.factor === active) : undefined;
  const shownAt = shown
    ? shown.percentile != null
      ? at(FACTORS.indexOf(shown.factor), shown.percentile)
      : at(FACTORS.indexOf(shown.factor), 100)
    : null;

  const toggle = (f: Factor) => setActive((cur) => (cur === f ? null : f));
  const onKey = (e: KeyboardEvent, f: Factor) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(f);
    }
    if (e.key === "Escape") setActive(null);
  };

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="group"
        aria-label={`${name}의 체력 육각형. ${summary}. 또래 평균은 50`}
        onPointerLeave={() => setActive(null)}
      >
        {/* 눈금 — 25 · 75 · 100. 한 겹 옅은 실선 */}
        {[25, 75, 100].map((v) => (
          <polygon
            key={v}
            points={ring(v)}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}
        {FACTORS.map((f, i) => {
          const [x, y] = at(i, 100);
          const on = focus === f;
          return (
            <line
              key={f}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke={on ? "var(--color-signal)" : "var(--color-line)"}
              strokeWidth={on ? 2 : 1}
            />
          );
        })}

        {/* 또래 평균 — 눈금이 아니라 한 계열이다. 범례에 이름이 있다 */}
        <polygon
          points={ring(50)}
          fill="none"
          stroke="var(--color-baseline)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* 아이 */}
        <g className="radar-grow" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {measured.length >= 3 && (
            <polygon
              points={measured.map((p) => vertex(p).join(",")).join(" ")}
              fill="var(--color-signal)"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          {edges.map((e) => (
            <line
              key={e.key}
              x1={e.from[0]}
              y1={e.from[1]}
              x2={e.to[0]}
              y2={e.to[1]}
              stroke="var(--color-signal)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={e.dashed ? "4 4" : undefined}
            />
          ))}
          {measured.map((p) => {
            const [x, y] = vertex(p);
            return (
              <circle
                key={p.factor}
                cx={x}
                cy={y}
                r={active === p.factor ? 6 : 4.5}
                fill="var(--color-signal)"
                stroke="var(--color-paper)"
                strokeWidth={2}
              />
            );
          })}
        </g>

        {/* 축 이름 + 누르는 자리. 점보다 넓게 잡는다 — 손가락은 4px 점을 못 누른다 */}
        {hex.map((p, i) => {
          const l = labelAt(i);
          const [hx, hy] = p.percentile != null ? at(i, p.percentile) : at(i, 100);
          const missing = p.percentile == null;
          return (
            <g
              key={p.factor}
              role="button"
              tabIndex={0}
              aria-label={`${p.factor} ${missing ? "아직 안 쟀어요" : `또래 백분위 ${p.percentile}`}`}
              aria-pressed={active === p.factor}
              onClick={() => toggle(p.factor)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(p.factor)}
              onFocus={() => setActive(p.factor)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => onKey(e, p.factor)}
              className="cursor-pointer"
            >
              <circle cx={hx} cy={hy} r={18} fill="transparent" />
              <text
                x={l.x}
                y={l.y}
                textAnchor={l.anchor}
                fontSize={12.5}
                fontWeight={focus === p.factor ? 800 : 700}
                className={missing ? "fill-faint" : "fill-ink"}
              >
                {p.factor}
              </text>
              {missing && (
                <text
                  x={l.x}
                  y={l.y + 14}
                  textAnchor={l.anchor}
                  fontSize={10.5}
                  fontWeight={600}
                  className="fill-faint"
                >
                  안 잰
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 누른 꼭지점의 값. 도형 위에 숫자를 다 찍지 않는 대신 여기서 하나씩 */}
      {shown && shownAt && (
        <div
          role="status"
          className="bg-ink pointer-events-none absolute z-10 w-max max-w-[11rem] rounded-xl px-3 py-2 text-white shadow-lg"
          style={{
            left: `${(shownAt[0] / W) * 100}%`,
            top: `${(shownAt[1] / H) * 100}%`,
            transform:
              shownAt[1] < H * 0.4
                ? "translate(-50%, 14px)"
                : "translate(-50%, calc(-100% - 14px))",
          }}
        >
          <p className="text-caption font-extrabold">
            {shown.factor}
            <span className="ml-1.5 font-bold text-white/85">
              {shown.percentile == null ? "안 잰" : `백분위 ${shown.percentile}`}
            </span>
          </p>
          <p className="text-micro mt-0.5 leading-snug text-white/85">
            {FACTOR_NOTE[shown.factor]}
          </p>
        </div>
      )}

      {legend && (
        <ul className="text-caption text-ink-soft mt-1 flex items-center justify-center gap-4 font-semibold">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="bg-signal relative h-0.5 w-4 rounded-full">
              <span className="bg-signal absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full" />
            </span>
            {name}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="bg-baseline h-0.5 w-4 rounded-full" />
            또래 평균
          </li>
        </ul>
      )}
    </div>
  );
}

/** 안 잰 요인이 몇 개인지 한 줄로. 도형이 비어 보이는 이유를 말한다 */
export function RadarGapNote({ points }: { points: RadarPoint[] | null | undefined }) {
  const hex = toHexagon(points);
  const got = measuredCount(hex);
  if (got === 0 || got === hex.length) return null;
  return (
    <p className="text-caption text-ink-soft mt-2 text-center">
      여섯 가지 중 {got}가지를 쟀어요. 나머지도 재면 그래프가 채워져요
    </p>
  );
}
