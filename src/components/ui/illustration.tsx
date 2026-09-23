"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

/** 에셋 그림. 파일이 없으면 조용히 숨는다 */
export function Illustration({
  name,
  fallback,
  alt = "",
  size = 96,
  className,
  style,
  priority,
}: {
  /** "scene/scene-no-record" 처럼 분류/이름 */
  name: string;
  /** `name` 이 없을 때 대신 쓸 그림 */
  fallback?: string;
  alt?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
}) {
  // 0 = 원본, 1 = 대체 그림, 2 = 둘 다 없음
  const [stage, setStage] = useState(0);
  if (stage >= 2) return null;
  const src = stage === 0 ? name : fallback;
  if (!src) return null;

  // 정사각 상자에 비율을 지켜 앉힌다. 높이를 auto 로 두면 세로로 긴 그림이 폭주한다
  return (
    <span
      className={cn("relative inline-block shrink-0 select-none", className)}
      style={{ width: size, height: size, ...style }}
    >
      <Image
        key={src}
        src={`/assets/${src}.png`}
        alt={alt}
        fill
        sizes={`${size}px`}
        priority={priority}
        onError={() => setStage((v) => (v === 0 && fallback ? 1 : 2))}
        className="object-contain"
      />
    </span>
  );
}
