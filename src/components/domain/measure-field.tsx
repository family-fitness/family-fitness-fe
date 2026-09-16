"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

import type { FitnessItem } from "@/lib/api/types";
import { equipmentArt, itemPose } from "@/lib/fitness-items";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";

/** 측정 항목 하나. */
export function MeasureField({
  item,
  register,
  error,
}: {
  item: FitnessItem;
  register: UseFormRegisterReturn;
  error?: string;
}) {
  const equipment = equipmentArt(item.itemCode);
  const range = item.range;

  return (
    <div className="flex items-start gap-3 py-4">
      <Illustration name={itemPose(item)} size={72} className="mt-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <label htmlFor={item.itemCode} className="text-[0.95rem] font-bold">
            {item.itemLabel ?? item.itemName}
          </label>
          {item.equipment && (
            <span className="text-faint inline-flex items-center gap-1 text-[0.7rem]">
              {equipment && <Illustration name={equipment} size={16} />}
              {item.equipment}
            </span>
          )}
        </div>

        <p className="text-ink-soft mt-0.5 text-xs">
          {item.factor}
          {range && (
            <span className="text-faint">
              {" · "}
              {range.min}~{range.max}
              {item.unit}
            </span>
          )}
        </p>

        <div className="relative mt-2">
          <input
            id={item.itemCode}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="숫자만"
            aria-describedby={error ? `${item.itemCode}-error` : undefined}
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
          <p id={`${item.itemCode}-error`} className="text-signal-deep mt-1 text-xs font-semibold">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
