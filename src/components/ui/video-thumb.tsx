"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { youtubeThumb } from "@/lib/videos";

/**
 * 영상 썸네일 한 장. 못 받으면(끊김 · 막힌 망) 깨진 그림 표시 대신 같은 크기의 빈 칸이 선다.
 * 깨진 그림이 줄마다 뜨면 화면이 고장 난 것처럼 보인다.
 *
 * `src` 가 오면 그 그림을 쓴다. 공단 mp4 영상은 서버가 준 장면 이미지, 유튜브 클립은 그 동작이 시작하는
 * 화면(`/thumbs/...`, 응답을 읽을 때 lib/videos 의 withClipThumbs 가 채운다)이다.
 * 없으면 유튜브 썸네일이다. 클립 화면 파일이 없으면(새로 생긴 클립) 유튜브 썸네일로 한 번 바꿔 본다.
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
  const youtube = youtubeThumb(videoId);
  const first = src || youtube;
  // 못 받은 그림들을 기억한다. 같은 자리에 다른 영상이 오면(칸을 바꾸면) 그 그림은 다시 받아 본다
  const [failed, setFailed] = useState<readonly string[]>([]);
  // 우리 서버의 클립 화면을 못 받았으면 유튜브 썸네일로 바꾼다
  const url = failed.includes(first) && first.startsWith("/thumbs/") ? youtube : first;

  if (failed.includes(url)) return <span aria-hidden className={cn("bg-sub block", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 썸네일은 외부 주소라 최적화가 안 된다
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed((list) => (list.includes(url) ? list : [...list, url].slice(-4)))}
      className={cn("bg-sub object-cover", className)}
    />
  );
}
