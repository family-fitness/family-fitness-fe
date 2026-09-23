"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

import { Activity } from "lucide-react";

import { FactorIcon } from "@/components/domain/factor-icon";
import type { FitnessItem } from "@/lib/api/types";
import { isFactor } from "@/lib/fitness-factors";
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
  const range = item.range;

  return (
    <div className="flex items-start gap-3 py-3.5">
      <span
        aria-hidden
        className="bg-signal-soft text-signal-strong mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl"
      >
        {/* 무엇을 키우는 항목인지 요인 그림으로. 항목마다 뽑던 그림은 결이 제각각이었다 */}
        {isFactor(item.factor) ? (
          <FactorIcon factor={item.factor} className="size-6" />
        ) : (
          <Activity className="size-5" strokeWidth={2.1} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <label htmlFor={item.itemCode} className="text-body font-bold">
            {item.itemLabel ?? item.itemName}
          </label>
          {item.equipment && <span className="text-ink-soft text-caption">{item.equipment}</span>}
        </div>

        <p className="text-ink-soft mt-0.5 text-xs">
          {item.factor}
          {range && (
            <span className="text-ink-soft">
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
            className={cn("field pr-14", error && "border-signal-deep")}
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
