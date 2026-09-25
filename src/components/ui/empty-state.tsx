import type { ReactNode } from "react";

import { Illustration } from "./illustration";

/** 빈 화면 · 그 순간의 그림. `ASSET_PROMPTS.md` 4장에 주문한 키움이 장면 */
type Scene = "no-record" | "no-mission" | "waiting" | "rest" | "no-alarm";

/**
 * 빈 화면 — 그림 · 지금 상태 한마디 · 할 일(있으면). 풀이 줄은 두지 않는다.
 *
 * 그림은 주문한 키움이 장면만 쓴다. 오기 전에는 그림 자리가 비고 글만 선다 —
 * 사람이 그려진 옛 장면으로 대신 세우지 않는다(사람 대신 그리는 건 키움이 하나다).
 */
export function EmptyState({
  scene,
  title,
  action,
}: {
  scene: Scene;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Illustration name={`scene/kiumi-${scene}`} size={140} />
      <p className="text-lg font-extrabold">{title}</p>
      {action}
    </div>
  );
}
