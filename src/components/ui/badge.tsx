import type { Band, Grade } from "@/lib/api/types";
import { BAND_COPY } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 국민체력100 등급 — 「2등급」. 둥근 딱지 · 테두리 없이 **글자로만** 쓴다(9/25 「둥근 배경 안에 넣는 건 AI 같다」).
 *
 * 등급은 같은 색의 **명도로만** 가른다(규칙 8) — 1등급이 가장 진하다. 참가 · 기준 없음은 옅은 글자.
 */
const TONE: Record<string, string> = {
  "1": "text-signal-deep",
  "2": "text-signal-strong",
  "3": "text-signal-deep/80",
};

export function GradeBadge({
  grade,
  className,
}: {
  grade: Grade | null | undefined;
  className?: string;
}) {
  const digit = grade?.match(/^(\d)등급$/)?.[1];
  const full = grade ?? "기준 없음";
  return (
    <span
      className={cn(
        "shrink-0 text-xs font-extrabold",
        digit ? (TONE[digit] ?? TONE["3"]) : "text-ink-soft font-bold",
        className,
      )}
    >
      {digit ? `${digit}등급` : full}
    </span>
  );
}

/** 백분위 구간 — 서버 코드값 대신 BAND_COPY 의 말로 */
export function BandChip({
  band,
  className,
}: {
  band: Band | null | undefined;
  className?: string;
}) {
  if (!band) return null;
  return (
    <span className={cn("text-ink-soft shrink-0 text-xs font-bold", className)}>
      {BAND_COPY[band]}
    </span>
  );
}
