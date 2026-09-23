import type { Band, Grade } from "@/lib/api/types";
import { BAND_COPY } from "@/lib/api/types";

/**
 * 국민체력100 등급 — 숫자를 품은 남색 고리.
 *
 * 등급은 같은 색의 **명도로만** 가른다(규칙 8). 옛 도장 그림은 결이 달라 뺐다.
 * 숫자가 없는 등급(참가 · 기준 없음)은 고리를 그리지 않는다 — 빈 동그라미는 덜 그린 것처럼 보인다.
 */
const RING: Record<string, string> = {
  "1": "border-signal-deep text-signal-deep",
  "2": "border-signal-strong text-signal-strong",
  "3": "border-signal text-signal-deep",
};

export function GradeBadge({
  grade,
  size = 30,
}: {
  grade: Grade | null | undefined;
  size?: number;
}) {
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
    <span className="inline-flex shrink-0 items-center gap-1.5" title={full} aria-label={full}>
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-full border-2 font-extrabold ${RING[digit] ?? RING["3"]}`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
      >
        {digit}
      </span>
      {/* 숫자는 고리 안에 있다. 옆에까지 쓰면 "2 2등급" 으로 읽힌다 */}
      <span className="text-ink-soft text-xs font-bold" aria-hidden>
        등급
      </span>
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
