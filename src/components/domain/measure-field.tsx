"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

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
      {/* 무엇을 키우는 항목인지 요인 그림으로. 육각형 밖의 요인(협응력 · 평형성)은 그림이 없어 자리만 둔다 —
          선 아이콘으로 대신 세우지 않는다(내용 자리는 주문한 그림만) */}
      <span aria-hidden className="mt-0.5 grid size-10 shrink-0 place-items-center">
        {isFactor(item.factor) && <FactorIcon factor={item.factor} className="size-8" />}
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
