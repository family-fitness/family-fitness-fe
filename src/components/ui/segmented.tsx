import { cn } from "@/lib/utils";

/**
 * 둘 · 셋 중 하나 고르기. 같은 것을 다르게 보는 자리(입체 / 평면)에 쓴다.
 * 누르는 칸은 44px 아래로 내려가지 않는다.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  /** 화면 읽기 프로그램이 읽을 이름 */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("bg-sub inline-flex rounded-full p-1", className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "press min-h-9 rounded-full px-3.5 text-xs font-extrabold transition-colors",
              // 누르는 자리는 위아래로 넉넉히 — 보이는 알약보다 넓게 잡힌다
              "relative after:absolute after:inset-x-0 after:-inset-y-1",
              on ? "bg-paper text-signal-deep shadow-card" : "text-ink-soft",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
