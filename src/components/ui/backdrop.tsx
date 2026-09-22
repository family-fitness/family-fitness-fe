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
        /*
          아래쪽을 흐리게 지운다. 장면과 글이 만나는 자리에 선이 생기면
          장식이 아니라 얼룩으로 읽힌다 — 본 영상 화면에서 체육관 공이
          카드 모서리에 걸려 있던 게 그랬다.
        */
        style={{
          maskImage: "linear-gradient(to bottom, #000 45%, transparent 95%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 45%, transparent 95%)",
        }}
      />
    </span>
  );
}
