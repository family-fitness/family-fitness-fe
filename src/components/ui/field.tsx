import type { ReactNode } from "react";

/** 라벨 + 설명 + 입력 한 묶음. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-ink-soft block text-xs font-bold">{label}</span>
      {hint && <span className="text-faint mt-0.5 block text-[0.7rem]">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
