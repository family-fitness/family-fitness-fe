import type { ReactNode } from "react";

import { Illustration } from "./illustration";

/**
 * 빈 화면.
 *
 * 분위기용이 아니라 다음 행동을 알려주는 자리다.
 * 글만 있으면 오류난 화면처럼 보이므로 그림을 함께 둔다.
 */
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
