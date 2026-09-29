"use client";

import { useState } from "react";

/*
  키 흐름 — 잴 때마다 점 하나(9/29 「캐릭터 세워두진 말고 기록으로 더 보기 편하게」).

  신체 점수 흐름과 같은 결이다. 세로는 잰 키 주변으로 좁힌다 — 0 부터 그리면 한 해 5cm 가 평평한 선이 된다.
  선 그래프라 0 에서 시작할 필요가 없다. 또래 키 기준은 서버가 주지 않아 그리지 않는다 — 지어내지 않는다.
  숫자는 점마다 적는다(많아지면 처음 · 끝만). 눌러야 나오는 값은 부모가 안 누른다.
*/

const W = 320;
const H = 150;
const PAD = { l: 20, r: 20, t: 26, b: 26 };
/** 이보다 많으면 숫자를 다 적지 않는다 — 글자끼리 부딪힌다 */
const LABEL_ALL = 6;

export interface HeightRecord {
  /** YYYY-MM-DD */
  date: string;
  heightCm: number;
}

export function HeightTrend({ records }: { records: HeightRecord[] }) {
  const [active, setActive] = useState<number | null>(null);
  // 한 번 잰 것은 선이 아니다 — 위의 값 칸이 말한다
  if (records.length < 2) return null;

  const x = (i: number) => PAD.l + ((W - PAD.l - PAD.r) * i) / (records.length - 1);
  const cms = records.map((r) => r.heightCm);
  const lo = Math.floor(Math.min(...cms) - 3);
  const hi = Math.ceil(Math.max(...cms) + 3);
  const y = (v: number) => PAD.t + ((H - PAD.t - PAD.b) * (hi - v)) / (hi - lo);
  // 같은 달에 두 번 쟀으면 달만으로는 두 점이 같은 이름이 된다 — 그때는 날까지
  const months = records.map((r) => r.date.slice(0, 7));
  const byDay = new Set(months).size < months.length;
  const tick = (d: string) =>
    byDay ? `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}` : `${Number(d.slice(5, 7))}월`;
  const day = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
  const labeled = new Set(
    records.length <= LABEL_ALL ? records.map((_, i) => i) : [0, records.length - 1],
  );
  const shown = active != null ? records[active] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="group"
        aria-label={`키 흐름. ${records.map((r) => `${day(r.date)} ${r.heightCm}cm`).join(", ")}`}
      >
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

        <polyline
          points={records.map((r, i) => `${x(i)},${y(r.heightCm)}`).join(" ")}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {records.map((r, i) => (
          <g
            key={r.date}
            role="button"
            tabIndex={0}
            aria-label={`${day(r.date)} ${r.heightCm}cm`}
            onClick={() => setActive((cur) => (cur === i ? null : i))}
            // 단추라면 엔터 · 스페이스로도 눌린다. 마우스를 올려 바뀌는 모양은 두지 않는다
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setActive((cur) => (cur === i ? null : i));
            }}
            // 키보드로 옮겨 왔을 때만 초점으로 연다 — 손가락으로 누르면 초점이 먼저 열고 누름이 바로 닫는다
            onFocus={(e) => {
              if (e.currentTarget.matches(":focus-visible")) setActive(i);
            }}
            onBlur={() => setActive(null)}
            className="cursor-pointer"
          >
            {/* 누르는 자리는 점보다 넓게 */}
            <circle cx={x(i)} cy={y(r.heightCm)} r={14} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(r.heightCm)}
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
              {tick(r.date)}
            </text>
            {labeled.has(i) && (
              <text
                x={x(i)}
                y={y(r.heightCm) - 11}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                className="fill-ink"
              >
                {r.heightCm}
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
            top: `${(y(shown.heightCm) / H) * 100}%`,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <p className="text-caption font-bold">
            {day(shown.date)} · {shown.heightCm}cm
          </p>
        </div>
      )}
    </div>
  );
}
