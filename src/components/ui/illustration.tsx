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
 * 체형마다 비율이 다르다. 성인과 유아에 같은 머리 크기를 쓰면
 * 41세 엄마가 2등신이 된다. 성인은 약 5등신, 아동은 4등신, 유아는 3등신으로 잡았다.
 */
const PROPORTION = {
  adult: { headW: 30, headTop: 1.5, headH: 23.5, bodyTop: 20.5, topTop: 25.5, topW: 42, topH: 26 },
  child: { headW: 36, headTop: 1, headH: 28.5, bodyTop: 24.5, topTop: 30, topW: 46, topH: 27 },
  toddler: { headW: 42, headTop: 0.5, headH: 33, bodyTop: 28.5, topTop: 34.5, topW: 52, topH: 27 },
} as const;

type BodyKind = keyof typeof PROPORTION;

function bodyKind(body: string): BodyKind {
  if (body.includes("toddler")) return "toddler";
  if (body.includes("child")) return "child";
  return "adult";
}

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
  const p = PROPORTION[bodyKind(parts.body)];

  // 겹치는 순서가 곧 앞뒤다. 옷이 몸을 덮고, 머리가 목을 덮고, 표정이 맨 위다
  type Layer = { name: string; box: [number, number, number, number] };

  const layers: Layer[] = [
    { name: parts.body, box: [24, p.bodyTop, 52, 100 - p.bodyTop] },
    ...(parts.top
      ? ([{ name: parts.top, box: [(100 - p.topW) / 2, p.topTop, p.topW, p.topH] }] as Layer[])
      : []),
    { name: parts.hair, box: [(100 - p.headW) / 2, p.headTop, p.headW, p.headH] },
    {
      name: parts.face,
      box: [50 - p.headW * 0.3, p.headTop + p.headH * 0.36, p.headW * 0.6, p.headH * 0.34],
    },
  ];

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {layers.map(({ name, box }) => (
        <span
          key={name}
          className="absolute"
          style={{
            left: `${box[0]}%`,
            top: `${box[1]}%`,
            width: `${box[2]}%`,
            height: `${box[3]}%`,
          }}
        >
          <AvatarLayer name={`char/${name}`} />
        </span>
      ))}
    </span>
  );
}

/** 사각형 안에 비율을 지켜 앉힌다 */
function AvatarLayer({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={`/assets/${name}.png`}
      alt=""
      fill
      sizes="128px"
      onError={() => setFailed(true)}
      className="object-contain"
    />
  );
}
