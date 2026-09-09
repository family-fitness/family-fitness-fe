"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 에셋 그림.
 *
 * 파일이 아직 없어도 화면이 깨지지 않게 조용히 숨는다.
 * 에셋은 ASSET_PROMPTS.md 규칙대로 public/assets/<분류>/<이름>.png 에 넣는다.
 *
 * 그림은 장식이 아니라 상태를 말하는 자리다. 뜻 없는 그림은 넣지 않는다.
 */
export function Illustration({
  name,
  alt = "",
  size = 96,
  className,
  priority,
}: {
  /** "scene/no-record" 처럼 분류/이름 */
  name: string;
  alt?: string;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={`/assets/${name}.png`}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("shrink-0 select-none", className)}
      // 부품을 겹쳐 쓰므로 원본 비율을 유지한다
      style={{ height: "auto" }}
    />
  );
}

/**
 * 캐릭터 아바타.
 *
 * 몸통 · 머리 · 표정 · 옷을 겹쳐 한 사람을 만든다.
 * 사람마다 그림을 따로 뽑으면 구성원이 늘 때마다 다시 뽑아야 한다.
 */
export interface AvatarParts {
  body: string;
  hair: string;
  face: string;
  top?: string;
}

export function Avatar({
  parts,
  size = 56,
  className,
}: {
  parts: AvatarParts;
  size?: number;
  className?: string;
}) {
  const layers = [
    `char/${parts.body}`,
    parts.top ? `char/${parts.top}` : null,
    `char/${parts.hair}`,
    `char/${parts.face}`,
  ].filter((v): v is string => v !== null);

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {layers.map((layer) => (
        <Illustration
          key={layer}
          name={layer}
          size={size}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ))}
    </span>
  );
}
