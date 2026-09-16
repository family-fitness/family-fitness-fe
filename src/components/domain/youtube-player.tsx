"use client";

import { useEffect, useRef, useState } from "react";

/** 유튜브 재생 진행률을 서버에 알리는 플레이어. */
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
  const [ready, setReady] = useState(false);

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
            // 플레이어가 준비되기 전까지는 빈 상자다. 그동안 뭘 하고 있는지 말해 준다
            onReady: () => setReady(true),
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
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
        target="_blank"
        rel="noreferrer noopener"
        className="border-line text-ink-soft block rounded-xl border p-4 text-center text-sm font-bold"
      >
        유튜브에서 열기
      </a>
    );
  }

  return (
    <div className="bg-sub relative overflow-hidden rounded-2xl">
      <div className="aspect-video w-full max-w-full">
        <div ref={holder} className="size-full" />
      </div>

      {/*
        유튜브 스크립트를 받아 오는 동안 화면이 회색 상자로 멈춰 있다.
        아이는 그걸 "고장" 으로 본다 — 무슨 일이 일어나는 중인지 적어 준다.
      */}
      {!ready && (
        <div className="bg-sub absolute inset-0 grid place-content-center gap-2 text-center">
          <span className="skeleton mx-auto block size-12 rounded-full" />
          <span className="text-ink-soft text-sm font-bold">영상을 불러오는 중</span>
        </div>
      )}
    </div>
  );
}
