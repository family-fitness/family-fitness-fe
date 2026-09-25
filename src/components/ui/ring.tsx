import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 한 바퀴 = 목표. 애플 피트니스의 링과 같은 읽는 법이다.
 *
 * 0이면 파랑을 아예 그리지 않는다. 둥근 끝(linecap)이 점 하나로 남아서
 * 조금 한 것처럼 보인다.
 */
export function Ring({
  value,
  max,
  size = 64,
  stroke = 8,
  label,
  className,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  /** 읽어 줄 말. 「오늘 12분 중 8분」 */
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-signal-soft)"
          strokeWidth={stroke}
        />
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
          />
        )}
      </svg>
      {children && (
        <div aria-hidden className="absolute inset-0 grid place-items-center">
          {children}
        </div>
      )}
    </div>
  );
}
