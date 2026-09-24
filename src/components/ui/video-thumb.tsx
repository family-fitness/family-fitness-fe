"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 유튜브 썸네일 한 장. 못 받으면(끊김 · 막힌 망) 깨진 그림 표시 대신 같은 크기의 빈 칸이 선다.
 * 깨진 그림이 줄마다 뜨면 화면이 고장 난 것처럼 보인다.
 */
export function VideoThumb({ videoId, className }: { videoId: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <span aria-hidden className={cn("bg-sub block", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 유튜브 썸네일은 외부 주소라 최적화가 안 된다
    <img
      src={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("bg-sub object-cover", className)}
    />
  );
}
