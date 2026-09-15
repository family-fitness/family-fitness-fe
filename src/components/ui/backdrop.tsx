"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 뒤에 까는 장면.
 *
 * 조각을 흩뿌리는 대신 **가로로 긴 장면 한 장**을 깐다. 흰 배경에 구름·별이
 * 떠다니면 이모지를 뿌려 놓은 것처럼 보이는데, 바닥선이나 하늘띠는 아이가
 * 어떤 장소에 있는 것처럼 만든다.
 *
 * 글 뒤에 깔리므로 **아주 옅어야 한다.** 에셋 자체를 옅게 뽑고, 여기서 한 번 더
 * 눌러 둔다. 글자를 읽는 데 방해가 되면 장식이 아니라 잡음이다.
 *
 * 파일이 없으면 조용히 사라진다 — 배경이 없어도 화면은 멀쩡해야 한다.
 */
export function Backdrop({
  name,
  className,
  height = 200,
  align = "top",
}: {
  /** "bg/bg-sky" 처럼 분류/이름 */
  name: string;
  className?: string;
  /** 띠 높이(px) */
  height?: number;
  align?: "top" | "bottom";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 -z-10 block overflow-hidden select-none",
        align === "top" ? "top-0" : "bottom-0",
        className,
      )}
      style={{ height }}
    >
      <Image
        src={`/assets/${name}.png`}
        alt=""
        fill
        sizes="100vw"
        onError={() => setFailed(true)}
        className={cn("object-cover", align === "top" ? "object-top" : "object-bottom")}
      />
    </span>
  );
}
