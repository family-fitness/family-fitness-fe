import { cn } from "@/lib/utils";

/**
 * 작은 막대 그래프. 한 주 일곱 칸처럼 칸 수가 적을 때만 쓴다.
 *
 * 강조는 하나다 — `highlight` 칸만 파랑, 나머지는 회색. 모든 막대가 파랑이면
 * 오늘이 어디인지 눈이 찾아야 한다. 숫자도 강조한 칸 위에만 적는다.
 *
 * 0인 날은 막대 대신 바닥에 짧은 선 하나. 칸이 비어 있으면 날짜가 빠진 것처럼 보인다.
 * 누를 것이 없는 그래프라 값은 `aria-label` 로 전부 읽어 준다.
 */
export function MiniBars({
  values,
  labels,
  highlight,
  unit = "분",
  height = 72,
  className,
}: {
  values: number[];
  labels: string[];
  highlight?: number;
  unit?: string;
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...values);
  const said = labels.map((l, i) => `${l} ${values[i] ?? 0}${unit}`).join(", ");

  return (
    <div role="img" aria-label={said} className={cn("w-full", className)}>
      <div className="flex items-end justify-between gap-1" style={{ height }}>
        {values.map((v, i) => {
          const on = i === highlight;
          const h = v > 0 ? Math.max(6, Math.round((v / max) * (height - 16))) : 0;
          return (
            <div key={labels[i] ?? i} className="flex flex-1 flex-col items-center justify-end">
              {on && v > 0 && (
                <span className="text-micro text-ink mb-0.5 font-extrabold">{v}</span>
              )}
              {v > 0 ? (
                <span
                  className={cn("w-2.5 rounded-t-sm", on ? "bg-signal" : "bg-bar")}
                  style={{ height: h }}
                />
              ) : (
                <span className="bg-line h-1 w-2.5 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between gap-1">
        {labels.map((l, i) => (
          <span
            key={l}
            className={cn(
              "text-micro flex-1 text-center font-bold",
              i === highlight ? "text-ink" : "text-faint",
            )}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
