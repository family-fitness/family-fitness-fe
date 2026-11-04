import type { FitnessAgeTest } from "@/lib/api/types";
import { trendOf } from "@/lib/fitness-age";

const W = 320;
const H = 132;
const PAD = { l: 18, r: 18, t: 24, b: 24 };
/** 이보다 많으면 숫자를 처음과 끝에만 적는다. 글자끼리 부딪힌다 */
const LABEL_ALL = 6;

const dayLabel = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;

/**
 * 회차마다의 체력 나이. 실제 나이를 점선으로 같이 그린다. 기준이 없으면 39가 좋은 건지 모른다.
 * 회차가 둘 이상일 때만 그린다.
 */
export function FitnessAgeTrend({ tests }: { tests: readonly FitnessAgeTest[] }) {
  const points = trendOf(tests);
  if (points.length < 2) return null;

  const values = points.flatMap((p) => [p.fitnessAge, p.age]);
  const lo = Math.min(...values) - 2;
  const hi = Math.max(...values) + 2;
  const x = (i: number) => PAD.l + ((W - PAD.l - PAD.r) * i) / (points.length - 1);
  const y = (v: number) => PAD.t + ((H - PAD.t - PAD.b) * (hi - v)) / (hi - lo);
  const line = (pick: (p: (typeof points)[number]) => number) =>
    points.map((p, i) => `${x(i)},${y(pick(p))}`).join(" ");
  const labeled = (i: number) => points.length <= LABEL_ALL || i === 0 || i === points.length - 1;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full overflow-visible"
        role="img"
        aria-label={`회차별 체력 나이. ${points
          .map((p) => `${dayLabel(p.testedOn)} ${p.fitnessAge}세, 실제 나이 ${p.age}세`)
          .join(", ")}`}
      >
        <polyline
          points={line((p) => p.age)}
          fill="none"
          stroke="var(--color-baseline)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <polyline
          points={line((p) => p.fitnessAge)}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={p.testedOn}>
            <circle
              cx={x(i)}
              cy={y(p.fitnessAge)}
              r={4.5}
              fill="var(--color-signal)"
              stroke="var(--color-paper)"
              strokeWidth={2}
            />
            {labeled(i) && (
              <text
                x={x(i)}
                // 실제 나이 선이 위에 있으면 숫자를 아래로 내려 선과 겹치지 않게 한다
                y={p.age < p.fitnessAge ? y(p.fitnessAge) - 10 : y(p.fitnessAge) + 18}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                className="fill-ink"
              >
                {p.fitnessAge}
              </text>
            )}
            {labeled(i) && (
              <text
                x={x(i)}
                y={H - 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                className="fill-ink-soft"
              >
                {dayLabel(p.testedOn)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <ul className="text-caption text-ink-soft mt-1 flex items-center justify-center gap-4 font-semibold">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="bg-signal h-0.5 w-4 rounded-full" />
          체력 나이
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="border-baseline w-4 border-t-2 border-dashed" />
          실제 나이
        </li>
      </ul>
    </div>
  );
}
