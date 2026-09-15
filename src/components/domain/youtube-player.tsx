"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 유튜브 재생 진행률을 서버에 알리는 플레이어.
 *
 * **서버가 진짜로 아는 두 값 중 하나다.** 0.9 를 처음 넘을 때 활동으로 1회 적립되고,
 * 그때부터 "영상 완주로 확인됨" 이라고 쓸 수 있다.
 *
 * IFrame API 를 직접 얹는다 — 라이브러리를 하나 더 들이기엔 하는 일이 적다.
 * 재생 중에만 5초마다 보고한다. 매초 보내면 한 영상에 120번을 부른다.
 */
declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: YtOptions) => YtPlayer;
      PlayerState: { PLAYING: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface YtOptions {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: () => void;
    onStateChange?: (e: { data: number }) => void;
  };
}

/** API 스크립트는 한 번만 넣는다 */
let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise<void>((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function YouTubePlayer({
  videoId,
  startSec,
  onProgress,
}: {
  videoId: string;
  startSec?: number | null;
  /** 진행률(0~1) 과 본 초. 재생 중 5초마다, 그리고 끝날 때 한 번 */
  onProgress: (progress: number, watchedSec: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<YtPlayer | null>(null);
  const reported = useRef(0);
  const [failed, setFailed] = useState(false);

  // onProgress 가 매 렌더 새 함수여도 플레이어를 다시 만들지 않게 붙들어 둔다
  const report = useRef(onProgress);
  useEffect(() => {
    report.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    let cancelled = false;
    let ticker: ReturnType<typeof setInterval> | undefined;

    loadApi()
      .then(() => {
        if (cancelled || !holder.current || !window.YT) return;

        player.current = new window.YT.Player(holder.current, {
          videoId,
          playerVars: { start: startSec ?? 0, playsinline: 1, rel: 0 },
          events: {
            onStateChange: (e) => {
              const playing = e.data === window.YT?.PlayerState.PLAYING;
              clearInterval(ticker);
              if (!playing) {
                if (e.data === window.YT?.PlayerState.ENDED) send();
                return;
              }
              ticker = setInterval(send, 5000);
            },
          },
        });
      })
      .catch(() => setFailed(true));

    function send() {
      const p = player.current;
      if (!p) return;
      const duration = p.getDuration();
      const watched = p.getCurrentTime();
      if (!duration) return;
      const progress = Math.min(1, watched / duration);
      // 뒤로 감아도 최대치만 의미가 있다. 서버도 최대 진행률만 남긴다
      if (progress <= reported.current) return;
      reported.current = progress;
      report.current(progress, Math.round(watched));
    }

    return () => {
      cancelled = true;
      clearInterval(ticker);
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId, startSec]);

  if (failed) {
    return (
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noreferrer noopener"
        className="border-line text-ink-soft block rounded-xl border p-4 text-center text-sm font-bold"
      >
        유튜브에서 열기
      </a>
    );
  }

  return (
    <div className="bg-sub overflow-hidden rounded-xl">
      <div className="aspect-video w-full max-w-full">
        <div ref={holder} className="size-full" />
      </div>
    </div>
  );
}
