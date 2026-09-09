"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 에셋 그림.
 *
 * 파일이 아직 없어도 화면이 깨지지 않게 조용히 숨는다.
 * 에셋은 `node scripts/prepare-assets.mjs` 로 여백을 잘라낸 뒤
 * public/assets/<분류>/<이름>.png 에 놓인다.
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
  /** "scene/scene-no-record" 처럼 분류/이름 */
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
      className={cn("shrink-0 object-contain select-none", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}

/**
 * 캐릭터 아바타.
 *
 * 몸통 · 옷 · 머리 · 표정을 겹쳐 한 사람을 만든다.
 * 사람마다 그림을 따로 뽑으면 구성원이 늘 때마다 다시 뽑아야 한다.
 *
 * 부품은 각자 원본 비율이 다르므로, 사각형 안에 비율을 지켜 앉히는 방식으로 배치한다.
 * 아래 비율은 다섯 체형(성인 남녀 · 아동 남녀 · 유아)에 모두 맞도록 맞춰 둔 값이다.
 */
const LAYER_BOX = {
  body: { left: 20, top: 34, width: 60, height: 66 },
  top: { left: 24.5, top: 38.5, width: 51, height: 29.5 },
  hair: { left: 27, top: 0, width: 46, height: 40 },
  face: { left: 40, top: 14.5, width: 20, height: 12 },
} as const;

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
  // 겹치는 순서가 곧 앞뒤다. 옷이 몸을 덮고, 머리가 목을 덮고, 표정이 맨 위다
  const layers: [keyof typeof LAYER_BOX, string][] = [
    ["body", parts.body],
    ...(parts.top ? ([["top", parts.top]] as [keyof typeof LAYER_BOX, string][]) : []),
    ["hair", parts.hair],
    ["face", parts.face],
  ];

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {layers.map(([kind, name]) => {
        const box = LAYER_BOX[kind];
        return (
          <span
            key={kind}
            className="absolute"
            style={{
              left: `${box.left}%`,
              top: `${box.top}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
          >
            <AvatarLayer name={`char/${name}`} />
          </span>
        );
      })}
    </span>
  );
}

/** 사각형 안에 비율을 지켜 가운데 아래로 앉힌다 */
function AvatarLayer({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={`/assets/${name}.png`}
      alt=""
      fill
      sizes="96px"
      onError={() => setFailed(true)}
      className="object-contain"
    />
  );
}
