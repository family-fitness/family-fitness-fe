import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { GRADE_LABEL } from "@/lib/fitness-items";
import type { FitnessGrade } from "@/lib/api/types";

const badge = cva("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold", {
  variants: {
    tone: {
      neutral: "bg-line text-ink-soft",
      track: "bg-track-soft text-track-deep",
      field: "bg-field-soft text-field",
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
 * 낮은 등급을 빨강으로 칠하지 않는다. 아이가 자기 화면에서 자기가 나쁘다는 신호를
 * 보게 되기 때문이다. 트랙 색의 진하기 단계로만 구분한다.
 */
const GRADE_STYLE: Record<FitnessGrade, string> = {
  1: "bg-track text-white",
  2: "bg-track/75 text-white",
  3: "bg-track/45 text-white",
  4: "bg-track-soft text-track-deep",
  5: "bg-track-soft/60 text-track-deep",
};

export function GradeBadge({ grade }: { grade: FitnessGrade }) {
  return (
    <span
      className={cn(
        "board-num inline-flex items-center rounded-md px-2 py-0.5 text-sm",
        GRADE_STYLE[grade],
      )}
    >
      {GRADE_LABEL[grade]}
    </span>
  );
}
