import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { Illustration } from "@/components/ui/illustration";
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
 * 도장 그림은 **테두리 겹수만 다르고 색은 같다.** 낮은 등급을 빨강으로 칠하면
 * 아이가 자기 화면에서 자기가 나쁘다는 신호를 본다.
 *
 * 규준이 없는 연령(만 7~10세 일부)은 등급이 null 로 온다. 그때는 비어 있는
 * 도장을 두고 「기준 없음」이라고 적는다 — 빈칸으로 두면 빠뜨린 것처럼 보인다.
 */
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

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5" title={full} aria-label={full}>
      <span
        className="relative grid shrink-0 place-items-center"
        style={{ width: size, height: size }}
      >
        <Illustration name={seal} size={size} alt="" />
        {digit && (
          <span
            className="text-signal-deep absolute inset-0 grid place-items-center font-extrabold"
            style={{ fontSize: size * 0.4 }}
            aria-hidden
          >
            {digit}
          </span>
        )}
      </span>
      <span className="text-ink-soft text-xs font-bold" aria-hidden>
        {label}
      </span>
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
