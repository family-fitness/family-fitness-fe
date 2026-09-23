import type { LucideIcon } from "lucide-react";

import { artFor } from "@/lib/interim-art";
import { cn } from "@/lib/utils";

/**
 * 그림 아이콘. 새 그림이 있으면 새 그림, 아직이면 옛 그림(`INTERIM`), 그것도 없으면
 * 선 아이콘이 대신 선다.
 *
 * 내용을 가리키는 자리(요인 · 메뉴 · 참여 방식)는 그림으로 간다(9/23 요청 —
 * "이모트는 쓰지 말고 이미지로"). 그림은 `ASSET_PROMPTS.md` 5장에 주문해 두었고,
 * 들어오면 `npm run assets` 가 목록을 고쳐 이 자리가 바뀐다. 목록에 없는 그림은
 * 부르지 않는다 — 없는 파일을 불렀다 숨기면 빈 상자가 한 번 번쩍인다.
 */
export function ArtIcon({
  name,
  fallback: Fallback,
  className,
}: {
  /** `icon/factor-cardio` 처럼 분류/이름 */
  name: string;
  fallback: LucideIcon;
  /** 크기. 그림이든 아이콘이든 같은 상자에 앉힌다 */
  className?: string;
}) {
  // 새 그림 → 옛 그림 → 선 아이콘 순으로 선다
  const art = artFor(name);
  if (art) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 작은 아이콘이라 최적화 이득보다 한 번 더 도는 요청이 크다
      <img
        src={`/assets/${art}.png`}
        alt=""
        aria-hidden
        className={cn("object-contain", className)}
      />
    );
  }
  return <Fallback aria-hidden className={className} strokeWidth={2.1} />;
}
