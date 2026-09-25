import { FactorIcon } from "@/components/domain/factor-icon";
import type { RadarPoint } from "@/lib/api/types";
import { FACTORS, toHexagon, type Factor, type FactorPointView } from "@/lib/fitness-factors";
import { cn } from "@/lib/utils";

/*
  체력 육각형 — 부모가 보는 그래프 하나.

  꼭지점은 **여섯 개 고정**이다(`FACTORS`). 서버가 다섯만 줘도 여섯 자리를 다 그린다 —
  사람마다 축이 달라지면 어제의 나와도, 옆집 아이와도 도형을 견줄 수 없다.

  두 겹을 그린다.
    아이   파랑 선 + 옅은 면. 잰 요인만 점을 찍는다
    또래   점선 정육각형 하나. 백분위 50 자리 — 기준이 없으면 62가 좋은지 모른다

  꼭지점마다 요인 그림 · 이름 · 값이 늘 보인다. 눌러야 나오는 값은 부모가 안 누른다.

  **값이 없는 요인은 0으로 그리지 않는다.** 가운데로 꺾여 들어가면 꼴찌처럼 보인다(규칙 8).
  그 꼭지점은 비워 두고 「—」 로 적는다(안 잰 것일 수도, 잰 나이에 비교 기준이 없는 것일 수도 있다).
  잰 두 꼭지점 사이를 건너뛰는 선은 점선으로 — 모르는 구간을 아는 척하지 않는다.
*/

const W = 320;
const H = 290;
const CX = W / 2;
const CY = 150;
const R = 88;

/** 꼭지점 i 에서 백분위 v 자리. 12시에서 시작해 시계 방향 */
function at(i: number, v: number): readonly [number, number] {
  const a = (Math.PI * 2 * i) / FACTORS.length - Math.PI / 2;
  const r = (R * v) / 100;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

const ring = (v: number) => FACTORS.map((_, i) => at(i, v).join(",")).join(" ");

/**
 * 꼭지점 글자 자리(퍼센트). 위 · 아래는 꼭지점 바로 바깥, 옆은 꼭지점에서 조금 떨어진 곳에
 * 가운데를 맞춘다 — 폭이 줄어도 칸 밖으로 나가지 않게.
 */
function labelAt(i: number): { left: string; top: string; transform: string } {
  const [x, y] = at(i, 100);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  if (i === 0) return { left: pct(x, W), top: pct(y - 6, H), transform: "translate(-50%, -100%)" };
  if (i === 3) return { left: pct(x, W), top: pct(y + 6, H), transform: "translate(-50%, 0)" };
  const side = x > CX ? 1 : -1;
  return { left: pct(CX + side * 112, W), top: pct(y, H), transform: "translate(-50%, -50%)" };
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
  /** 이 요인의 이름에 옅은 칸을 씌운다. AI 편성이 무엇을 키우려는지 보여 줄 때(축은 늘 옅게) */
  focus?: Factor | null;
  legend?: boolean;
  className?: string;
}) {
  const hex = toHexagon(points);

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

  // 화면의 「—」 와 같은 말 — 「안 잰」 이라 읽으면 쟀는데 비교 기준이 없는 나이의 값까지 안 잰 것이 된다
  const summary = hex
    .map((p) => `${p.factor} ${p.percentile == null ? "값 없음" : `또래 백분위 ${p.percentile}`}`)
    .join(", ");

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`${name}의 체력 육각형. ${summary}. 또래 평균은 50`}
        >
          {/* 눈금 — 25 · 75 · 100. 한 겹 옅은 실선 */}
          {[25, 75, 100].map((v) => (
            <polygon
              key={v}
              points={ring(v)}
              fill={v === 100 ? "var(--color-sub)" : "none"}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          ))}
          {/* 축은 늘 옅게. 고른 요인을 파랑 축으로 그렸더니 값 선처럼 읽혔다 — 고른 것은 이름이 말한다 */}
          {FACTORS.map((f, i) => {
            const [x, y] = at(i, 100);
            return (
              <line
                key={f}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth={1}
              />
            );
          })}

          {/* 또래 평균 — 점선. 눈금이 아니라 견줄 기준이다. 범례에 이름이 있다 */}
          <polygon
            points={ring(50)}
            fill="none"
            stroke="var(--color-baseline)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />

          {/* 아이 — 가운데에서 차오른다 */}
          <g className="radar-grow" style={{ transformOrigin: `${CX}px ${CY}px` }}>
            {measured.length >= 3 && (
              <polygon
                points={measured.map((p) => vertex(p).join(",")).join(" ")}
                fill="var(--color-signal)"
                fillOpacity={0.16}
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
                strokeWidth={2.5}
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
                  r={5}
                  fill="var(--color-signal)"
                  stroke="var(--color-paper)"
                  strokeWidth={2}
                />
              );
            })}
          </g>
        </svg>

        {/* 꼭지점마다 그림 · 이름 · 값 — 글자는 캔버스가 아니라 글로(확대해도 번지지 않는다) */}
        {hex.map((p, i) => {
          const missing = p.percentile == null;
          return (
            <span
              key={p.factor}
              aria-hidden
              className="absolute flex flex-col items-center leading-tight whitespace-nowrap"
              style={labelAt(i)}
            >
              <span
                className={cn(
                  "flex items-center gap-1",
                  // 키울 힘은 글자색으로만 — 둥근 바탕을 깔지 않는다(9/25)
                  focus === p.factor && "text-signal-deep",
                )}
              >
                <FactorIcon factor={p.factor} className={cn("size-4.5", missing && "opacity-40")} />
                <span
                  className={cn(
                    "text-micro font-bold",
                    missing ? "text-faint" : "text-ink-soft",
                    focus === p.factor && "text-signal-deep font-extrabold",
                  )}
                >
                  {p.factor}
                </span>
              </span>
              {/* 값이 없으면 「—」 — 안 잰 것일 수도, 잰 나이에 비교 기준이 없는 것일 수도 있다(규칙 8).
                  어느 쪽인지는 요인 표가 항목과 같이 말한다 */}
              {missing ? (
                <span className="text-micro text-faint mt-0.5 font-semibold">—</span>
              ) : (
                <span className="text-ink text-base font-extrabold tabular-nums">
                  {p.percentile}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {legend && (
        <ul className="text-caption text-ink-soft mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-semibold">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="bg-signal relative h-0.5 w-4 rounded-full">
              <span className="bg-signal absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full" />
            </span>
            {name} · 또래 백분위
          </li>
          <li className="flex items-center gap-1.5">
            <svg aria-hidden width="16" height="2" className="overflow-visible">
              <line
                x1="0"
                y1="1"
                x2="16"
                y2="1"
                stroke="var(--color-baseline)"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            </svg>
            {/* 무엇과 견준 값인지 — 국민체력100 공공데이터의 또래(공모전이라 출처가 보여야 한다) */}
            국민체력100 또래 평균
          </li>
        </ul>
      )}
    </div>
  );
}
