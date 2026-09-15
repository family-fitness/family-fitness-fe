"use client";

import { Illustration } from "@/components/ui/illustration";
import { stampArt, stampOf } from "@/lib/stamps";
import { cn } from "@/lib/utils";

/**
 * 찍힌 도장 한 개.
 *
 * 2차 에셋(`stamp/`)이 오기 전에는 1차 메달 그림으로 버틴다.
 * `Illustration` 의 fallback 이 그 일을 한다 — 화면이 비어 보이지 않는다.
 */
export function StampMark({
  stamp,
  size = 56,
  className,
  animate,
}: {
  stamp: string | null | undefined;
  size?: number;
  className?: string;
  /** 방금 찍혔을 때. 눌렸다 튕기는 느낌을 준다 */
  animate?: boolean;
}) {
  const meta = stampOf(stamp);
  return (
    <span className={cn("inline-grid place-items-center", animate && "stamp-hit", className)}>
      <Illustration
        name={stampArt(stamp)}
        fallback="item/item-medal"
        size={size}
        alt={meta?.label ?? "도장"}
      />
    </span>
  );
}
