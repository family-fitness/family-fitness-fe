import { Illustration } from "@/components/ui/illustration";
import type { Band, Grade } from "@/lib/api/types";
import { BAND_COPY } from "@/lib/api/types";

/** 국민체력100 등급. */
const GRADE_SEAL: Record<Grade, string> = {
  "1등급": "item/grade-1",
  "2등급": "item/grade-2",
  "3등급": "item/grade-3",
  참가: "item/grade-4",
};

export function GradeBadge({
  grade,
  size = 30,
}: {
  grade: Grade | null | undefined;
  size?: number;
}) {
  const seal = grade ? GRADE_SEAL[grade] : "item/grade-5";
  const digit = grade?.match(/^(\d)등급$/)?.[1];
  // 숫자는 도장 안에 있다. 옆에까지 쓰면 "2 2등급" 으로 읽힌다
  const label = digit ? "등급" : (grade ?? "기준 없음");
  const full = grade ?? "기준 없음";

  /*
    숫자가 없는 등급(참가·기준 없음)에는 도장을 그리지 않는다.
    빈 동그라미만 남아 그림이 덜 그려진 것처럼 보인다.
  */
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
        className="relative grid shrink-0 place-items-center"
        style={{ width: size, height: size }}
      >
        <Illustration name={seal} size={size} alt="" />
        <span
          className="text-signal-deep absolute inset-0 grid place-items-center font-extrabold"
          style={{ fontSize: size * 0.4 }}
          aria-hidden
        >
          {digit}
        </span>
      </span>
      <span className="text-ink-soft text-xs font-bold" aria-hidden>
        {label}
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
