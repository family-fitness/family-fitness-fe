import type { Band, Grade } from "@/lib/api/types";
import { BAND_COPY } from "@/lib/api/types";

/**
 * 국민체력100 등급 — 「2등급」 한 칸. 참가 · 기준 없음과 **같은 모양의 칩**이다(모양이 다르면 다른 것처럼 보인다).
 *
 * 등급은 같은 색의 **명도로만** 가른다(규칙 8). 옛 도장 그림은 결이 달라 뺐다.
 */
const RING: Record<string, string> = {
  "1": "border-signal-deep text-signal-deep",
  "2": "border-signal-strong text-signal-strong",
  "3": "border-signal text-signal-deep",
};

export function GradeBadge({ grade }: { grade: Grade | null | undefined }) {
  const digit = grade?.match(/^(\d)등급$/)?.[1];
  const full = grade ?? "기준 없음";

  if (!digit) {
    return (
      <span
        className="border-line text-ink-soft inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-bold"
        title={full}
      >
        {full}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-extrabold ${RING[digit] ?? RING["3"]}`}
      title={full}
    >
      {digit}등급
    </span>
  );
}

/** 백분위 구간. */
export function BandChip({ band }: { band: Band | null | undefined }) {
  if (!band) return null;
  return (
    <span className="border-line text-ink-soft inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-bold">
      {BAND_COPY[band]}
    </span>
  );
}
