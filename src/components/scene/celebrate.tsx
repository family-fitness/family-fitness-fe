"use client";

import { SpriteField } from "./sprite-field";

/**
 * 완료 축하 연출.
 *
 * 화면 위에 한 번 터뜨리고 사라진다. 상태가 바뀐 걸 알리는 목적이지 장식이 아니다.
 * 클릭을 막으면 안 되므로 pointer-events 를 끈다.
 */
export function Celebrate({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <SpriteField
        assets={["deco/deco-confetti", "deco/deco-star", "deco/deco-sparkle", "item/item-medal"]}
        count={34}
        burst
        className="size-full"
      />
    </div>
  );
}
