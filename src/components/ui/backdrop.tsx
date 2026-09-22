"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 맨 위에 까는 장면 한 장.
 *
 * 그림은 전부 **가로로 긴 3:1 한 장**이고, 나무·소파·구름 같은 것이 **좌우
 * 끝에만** 있고 가운데는 비어 있다. 글이 가운데로 흐르게 하려고 그렇게 그렸다.
 *
 * 그래서 잘라 채우면(`object-cover`) 안 된다 — 폰 너비에서는 왼쪽 나무 하나가
 * 화면 절반까지 확대되어 칩이나 제목 위로 올라온다. 실제로 아이 화면의 구름,
 * 고르기 화면의 나무, 부모 홈의 언덕이 전부 그렇게 줄을 가로질렀다.
 * **폭에 맞춰 통째로 넣고**(`object-contain`) 높이는 비율이 정하게 둔다.
 */
export function Backdrop({ name, className }: { name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 -z-10 block aspect-[3/1] select-none",
        className,
      )}
    >
      <Image
        src={`/assets/${name}.png`}
        alt=""
        fill
        sizes="100vw"
        onError={() => setFailed(true)}
        className="object-contain object-top"
      />
    </span>
  );
}
