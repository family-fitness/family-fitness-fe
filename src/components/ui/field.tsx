import type { ReactNode } from "react";

/**
 * 라벨 + 설명 + 입력 한 묶음.
 *
 * 설명을 placeholder 로 대신하지 않는다. 입력을 시작하면 사라져서,
 * 왜 이걸 묻는지 확인할 방법이 없어진다.
 */
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
