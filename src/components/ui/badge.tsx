import type { Band, Grade } from "@/lib/api/types";
import { BAND_COPY } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 국민체력100 등급 — 「2등급」. 둥근 딱지 · 테두리 없이 **글자로만** 쓴다(9/25 「둥근 배경 안에 넣는 건 AI 같다」).
 *
 * 등급은 **한 색(남색)의 명도로만** 가른다(규칙 8) — 1등급이 가장 진하고 3등급이 가장 옅다. 전에는 2등급이 밝은 파랑,
 * 3등급이 옅은 남색이라 3등급이 2등급보다 진해 보였고 색도 둘이었다. 참가 · 기준 없음은 회색 글자.
 */
const TONE: Record<string, string> = {
  "1": "text-signal-deep",
  "2": "text-signal-deep/85",
  // 흰 바탕에서 4.5:1 을 넘는 가장 옅은 명도(60% 는 4.0 으로 모자랐다)
  "3": "text-signal-deep/72",
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
