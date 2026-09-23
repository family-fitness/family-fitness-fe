import { cn } from "@/lib/utils";

/**
 * 겹 링. 애플 피트니스처럼 바깥에서 안으로 한 바퀴씩, 한 바퀴가 목표다.
 *
 * 링마다 색이 다르니 **범례를 늘 같이 둔다**(색만으로 구분하지 않는다). 목표를 넘겨도
 * 한 바퀴에서 멈춘다 — 두 바퀴째를 그리면 더 한 날이 덜 한 날보다 나은 날처럼 보인다.
 * 0이면 그 링의 색을 그리지 않는다. 둥근 끝이 점 하나로 남아 조금 한 것처럼 보인다.
 *
 * 처음 그릴 때는 움직이지 않는다 — 한 화면에 움직이는 것은 하나다. 값이 바뀔 때만
 * (운동을 마치고 돌아왔을 때) 새 자리까지 차오른다.
 */
export interface RingValue {
  value: number;
  max: number;
  /** 링 색. 토큰 이름(var(--color-…)) */
  color: string;
  /** 빈 자리 색 */
  track: string;
  label: string;
  /** 범례에 쓰는 값. 「8 / 12분」 */
  text: string;
}

export function ActivityRings({
  rings,
  size = 128,
  stroke = 13,
  gap = 3,
  className,
}: {
  rings: RingValue[];
  size?: number;
  stroke?: number;
  gap?: number;
  className?: string;
}) {
  const said = rings.map((r) => `${r.label} ${r.text}`).join(", ");

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label={said}
      >
        {rings.map((ring, i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + gap);
          if (r <= 0) return null;
          const c = 2 * Math.PI * r;
          const p = ring.max > 0 ? Math.max(0, Math.min(1, ring.value / ring.max)) : 0;
          return (
            <g key={ring.label}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={ring.track}
                strokeWidth={stroke}
              />
              {p > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - p)}
                  className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* 범례 — 이름 위, 값 아래. 한 줄에 두면 좁은 폰에서 이름이 잘린다 */}
      <ul className="min-w-0 flex-1 space-y-2.5" aria-hidden>
        {rings.map((ring) => (
          <li key={ring.label} className="flex gap-2">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-full"
              style={{ background: ring.color }}
            />
            <span className="min-w-0">
              <span className="text-caption text-ink-soft block font-bold">{ring.label}</span>
              <span className="block text-base leading-tight font-extrabold tabular-nums">
                {ring.text}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
