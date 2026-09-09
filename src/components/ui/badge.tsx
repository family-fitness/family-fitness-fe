import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { GRADE_LABEL } from "@/lib/fitness-items";
import type { FitnessGrade } from "@/lib/api/types";

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
 * 낮은 등급을 빨강으로 칠하지 않는다. 아이가 자기 화면에서 자기가 나쁘다는 신호를
 * 보게 되기 때문이다. 하나의 색을 진하기 단계로만 나눈다.
 */
const GRADE_STYLE: Record<FitnessGrade, string> = {
  1: "bg-ink text-paper",
  2: "bg-ink/72 text-paper",
  3: "bg-ink/45 text-paper",
  4: "bg-line text-ink-soft",
  5: "bg-line/60 text-ink-soft",
};

export function GradeBadge({ grade }: { grade: FitnessGrade }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-extrabold",
        GRADE_STYLE[grade],
      )}
    >
      {GRADE_LABEL[grade]}
    </span>
  );
}
