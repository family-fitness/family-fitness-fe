import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Band, Grade } from "@/lib/api/types";
import { BAND_COPY } from "@/lib/api/types";

const badge = cva("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold", {
  variants: {
    tone: {
      neutral: "bg-line text-ink-soft",
      signal: "bg-signal-soft text-signal-deep",
      done: "bg-done-soft text-done",
      outline: "border-line text-ink-soft border",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({
  tone,
  className,
  children,
}: VariantProps<typeof badge> & { className?: string; children: ReactNode }) {
  return <span className={cn(badge({ tone }), className)}>{children}</span>;
}

/**
 * 국민체력100 등급.
 *
 * 서버가 주는 값은 1·2·3등급과 「참가」뿐이다. 규준에 못 미쳐도 「참가」다 —
 * 「미달」·「하위」 같은 말을 프론트에서 만들어 붙이지 않는다.
 *
 * 낮은 등급을 빨강으로 칠하지 않는다. 아이가 자기 화면에서 자기가 나쁘다는 신호를
 * 보게 되기 때문이다. 하나의 색을 진하기 단계로만 나눈다.
 */
const GRADE_STYLE: Record<Grade, string> = {
  "1등급": "bg-ink text-paper",
  "2등급": "bg-ink/72 text-paper",
  "3등급": "bg-ink/45 text-paper",
  참가: "bg-line text-ink-soft",
};

export function GradeBadge({ grade }: { grade: Grade | null | undefined }) {
  // 규준이 없는 연령대(만 7~10세 일부)는 등급이 null 로 온다. 빈칸을 그리지 않는다
  if (!grade) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-extrabold",
        GRADE_STYLE[grade],
      )}
    >
      {grade}
    </span>
  );
}

/**
 * 백분위 구간.
 *
 * 등급이 서열이라면 band 는 상태다. 아이에게 보여도 낙인이 되지 않아서
 * 자녀 화면에서는 등급 대신 이걸 쓴다. 코드값(strength)을 그대로 쓰지 않는다.
 */
export function BandChip({ band }: { band: Band | null | undefined }) {
  if (!band) return null;
  return (
    <span className="border-line text-ink-soft inline-flex shrink-0 items-center rounded-md border px-2 py-1 text-xs font-bold">
      {BAND_COPY[band]}
    </span>
  );
}
