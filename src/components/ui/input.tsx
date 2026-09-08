"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/** 라벨 · 단위 · 힌트 · 오류를 한 묶음으로 다루는 입력 필드 */
export function Field({
  label,
  unit,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  unit?: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "bg-surface border-line h-12 w-full rounded-xl border px-4 text-base",
            "placeholder:text-faint focus:border-grow focus:outline-none",
            unit && "pr-12",
            error && "border-mark",
            className,
          )}
          {...props}
        />
        {unit && (
          <span className="text-mute absolute top-1/2 right-4 -translate-y-1/2 text-sm">
            {unit}
          </span>
        )}
      </div>

      {hint && !error && (
        <p id={`${id}-hint`} className="text-faint text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-mark text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

/** 라디오처럼 하나만 고르는 선택지 목록 */
export function ChoiceList<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; description?: ReactNode }[];
}) {
  return (
    <div role="radiogroup" className="space-y-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition-colors",
              selected ? "border-grow bg-grow-50" : "border-line bg-surface",
            )}
          >
            <span className={cn("font-medium", selected && "text-grow")}>{option.label}</span>
            {option.description && (
              <span className="text-mute mt-1 block text-sm">{option.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
