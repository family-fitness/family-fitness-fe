import type { ReactNode } from "react";

import { Illustration } from "./illustration";

/** 빈 화면. */
export function EmptyState({
  scene,
  title,
  description,
  action,
}: {
  /** ASSET_PROMPTS.md 의 scene 이름. 예: "no-record" */
  scene: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Illustration name={`scene/scene-${scene}`} size={140} />
      <p className="text-lg font-extrabold">{title}</p>
      {description && (
        <p className="text-ink-soft max-w-xs text-sm leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  );
}
