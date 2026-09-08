import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 빈 화면.
 * 분위기가 아니라 다음 행동을 알려주는 자리다 — 왜 비었는지와 무엇을 하면 되는지.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="bg-line/60 text-faint rounded-full p-3">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="text-mute max-w-xs text-sm">{description}</p>}
      {action}
    </div>
  );
}
