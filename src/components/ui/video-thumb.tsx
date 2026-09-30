"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * 영상 썸네일 한 장. 못 받으면(끊김 · 막힌 망) 깨진 그림 표시 대신 같은 크기의 빈 칸이 선다.
 * 깨진 그림이 줄마다 뜨면 화면이 고장 난 것처럼 보인다.
 *
 * `src` 가 오면 그 그림을 쓴다 — 공단 mp4 영상은 유튜브 아이디가 아니라서 장면 이미지 주소가 따로 온다.
 * 없으면 유튜브 썸네일이다.
 */
export function VideoThumb({
  videoId,
  src,
  className,
}: {
  videoId: string;
  src?: string | null;
  className?: string;
}) {
  const url = src || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
  // 못 받은 그림을 기억한다 — 같은 자리에 다른 영상이 오면(칸을 바꾸면) 그 그림은 다시 받아 본다
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (failedUrl === url) return <span aria-hidden className={cn("bg-sub block", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 썸네일은 외부 주소라 최적화가 안 된다
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailedUrl(url)}
      className={cn("bg-sub object-cover", className)}
    />
  );
}
