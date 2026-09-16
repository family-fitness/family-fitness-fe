"use client";

import { SpriteField } from "./sprite-field";

/** 완료 축하 연출. */
/** 컴포넌트 밖에 둔다. 렌더마다 새 배열이면 WebGL 이 매번 다시 만들어진다 */
const PIECES = ["deco/deco-confetti", "deco/deco-star", "deco/deco-sparkle", "item/item-medal"];

export function Celebrate({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <SpriteField assets={PIECES} count={34} burst className="size-full" />
    </div>
  );
}
