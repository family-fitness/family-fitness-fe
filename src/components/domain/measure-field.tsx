"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

import type { FitnessItemMeta } from "@/lib/api/types";
import { ITEM_EQUIPMENT, ITEM_POSE } from "@/lib/fitness-items";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";

/**
 * 측정 항목 하나.
 *
 * 자세 그림을 왼쪽에 두고 입력을 오른쪽에 둔다. 그림이 없으면
 * "윗몸말아올리기 (회)" 라는 글만 남아서, 부모가 자세가 맞는지 확인할 방법이 없다.
 *
 * 장비가 필요한 항목에는 그 장비 그림을 작게 붙인다.
 * 악력계가 뭔지 모르는 사람이 많다.
 */
export function MeasureField({
  item,
  register,
  error,
}: {
  item: FitnessItemMeta;
  register: UseFormRegisterReturn;
  error?: string;
}) {
  const equipment = ITEM_EQUIPMENT[item.code];

  return (
    <div className="flex items-start gap-3 py-4">
      <Illustration
        name={ITEM_POSE[item.code]}
        size={72}
        className="mt-0.5"
        alt={`${item.label} 자세`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <label htmlFor={item.code} className="text-[0.95rem] font-bold">
            {item.label}
          </label>
          {equipment && (
            <span className="text-faint inline-flex items-center gap-1 text-[0.7rem]">
              <Illustration name={equipment} size={16} />
              장비 필요
            </span>
          )}
        </div>

        {item.hint && <p className="text-ink-soft mt-0.5 text-xs">{item.hint}</p>}

        <div className="relative mt-2">
          <input
            id={item.code}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="숫자만"
            aria-describedby={error ? `${item.code}-error` : undefined}
            aria-invalid={error ? true : undefined}
            className={cn(
              "border-line h-12 w-full rounded-xl border bg-transparent pr-14 pl-4 text-base",
              "placeholder:text-faint focus:border-signal focus:outline-none",
              error && "border-signal-deep",
            )}
            {...register}
          />
          <span className="text-ink-soft absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold">
            {item.unit}
          </span>
        </div>

        {error && (
          <p id={`${item.code}-error`} className="text-signal-deep mt-1 text-xs font-semibold">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
