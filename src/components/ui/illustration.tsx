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

/** 몸통·옷·머리·표정을 겹쳐 한 사람을 만든다. 체형마다 등신 비율이 다르다 */
const PROPORTION = {
  adult: { headW: 30, headTop: 1.5, headH: 23.5, bodyTop: 20.5 },
  child: { headW: 36, headTop: 1, headH: 28.5, bodyTop: 24.5 },
  toddler: { headW: 42, headTop: 0.5, headH: 33, bodyTop: 28.5 },
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

  /*
    겹치는 순서가 곧 앞뒤다. 머리가 목을 덮고, 표정이 맨 위다.

    **옷은 겹치지 않는다.** `top-*` 은 쇼핑몰 사진처럼 옷만 따로 그린 평면 그림이고
    `body-*` 는 이미 흰 티셔츠와 반바지를 입은 완성된 몸이다. 둘을 겹치면 옷 위에
    옷이 얹혀 이상해진다. 몸에 맞춰 그린 옷이 오면 그때 층을 하나 더 둔다.
    ▲ ASSET_PROMPTS_DECOR.md 7절에 요청해 뒀다.
  */
  type Layer = { name: string; box: [number, number, number, number] };

  const layers: Layer[] = [
    { name: parts.body, box: [24, p.bodyTop, 52, 100 - p.bodyTop] },
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
