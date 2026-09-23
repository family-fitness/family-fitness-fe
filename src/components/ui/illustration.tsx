"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import { ASSETS } from "@/lib/asset-list";
import { cn } from "@/lib/utils";

/**
 * 에셋 그림. 주문한 그림이 아직 없으면 **자리를 비운다** — 다른 그림으로 대신 세우지 않는다.
 * 있는 그림 목록(`asset-list`)에 없는 것은 부르지도 않는다. 불렀다가 실패해서 숨기면
 * 그 사이에 빈 상자가 번쩍이고 콘솔에 404 가 쌓인다.
 */
export function Illustration({
  name,
  alt = "",
  size = 96,
  className,
  style,
  priority,
}: {
  /** "scene/kiumi-no-record" 처럼 분류/이름 */
  name: string;
  alt?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
}) {
  if (!ASSETS.has(name)) return null;

  // 정사각 상자에 비율을 지켜 앉힌다. 높이를 auto 로 두면 세로로 긴 그림이 폭주한다
  return (
    <span
      className={cn("relative inline-block shrink-0 select-none", className)}
      style={{ width: size, height: size, ...style }}
    >
      <Image
        src={`/assets/${name}.png`}
        alt={alt}
        fill
        sizes={`${size}px`}
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}
