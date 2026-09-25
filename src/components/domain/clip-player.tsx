"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/*
  운동 한 칸의 시범 영상.

  **영상이 운동의 길이를 정하지 않는다.** 타이머가 정한다(9/23 회의 — "무조건 시간으로").
  클립은 1분 남짓인데 잡힌 시간이 4분이면, 타이머가 도는 동안 클립을 되풀이한다.
  그래서 이 플레이어는 스스로 끝나지 않고, 위에서 `playing` 으로 켜고 끈다.

  자동 재생이 막히는 경우가 있다. 한 칸을 끝내고 다음 칸으로 스스로 넘어갈 때는
  누른 손가락이 없어서, 브라우저(특히 아이폰)가 소리 있는 재생을 막는다. 그러면 소리를
  끄고 다시 틀고, 그래도 안 되면 위에 알린다(`onBlocked`) — 타이머를 멈추고 「눌러서 시작」.
*/

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: YtOptions) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
}

interface YtOptions {
  events?: {
    onReady?: () => void;
    onStateChange?: (e: { data: number }) => void;
    onError?: () => void;
  };
}

const PLAYING = 1;
const ENDED = 0;

/** API 스크립트는 한 번만 넣는다 */
let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("youtube api"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** 우리가 만드는 임베드 주소. 끝(end)은 넣지 않는다 — 되풀이를 우리가 하기 때문이다 */
function embedSrc(videoId: string, startSec: number): string {
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    start: String(Math.floor(startSec)),
  });
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params}`;
}

export function ClipPlayer({
  videoId,
  startSec,
  endSec,
  playing,
  title,
  onBlocked,
}: {
  videoId: string;
  startSec: number;
  /** 없으면 영상 끝까지가 한 칸이다 */
  endSec: number | null;
  /** 타이머가 도는 동안 true */
  playing: boolean;
  title: string;
  /** 소리를 꺼도 재생이 안 됐다 */
  onBlocked?: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<YtPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(false);

  const blocked = useRef(onBlocked);
  useEffect(() => {
    blocked.current = onBlocked;
  }, [onBlocked]);

  // 플레이어 만들기. 영상이 바뀔 때만
  useEffect(() => {
    let cancelled = false;
    loadApi()
      .then(() => {
        if (cancelled || !frame.current || !window.YT) return;
        player.current = new window.YT.Player(frame.current, {
          events: {
            onReady: () => setReady(true),
            // 비공개 · 삭제 · 임베드 금지. 유튜브의 검은 상자를 그대로 두지 않는다
            onError: () => setFailed(true),
            onStateChange: (e) => {
              // 영상 끝까지 가 버렸으면 클립 처음으로
              if (e.data === ENDED) player.current?.seekTo(startSec, true);
            },
          },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      setReady(false);
    };
  }, [videoId, startSec]);

  // 켜고 끄기 · 되풀이
  useEffect(() => {
    const p = player.current;
    if (!ready || !p) return;
    if (!playing) {
      p.pauseVideo();
      return;
    }

    p.playVideo();
    // 막혔나 본다. 소리를 끄고 한 번 더, 그래도 안 되면 위에 알린다
    let second: ReturnType<typeof setTimeout> | undefined;
    const first = setTimeout(() => {
      if (p.getPlayerState() === PLAYING) return;
      p.mute();
      setMuted(true);
      p.playVideo();
      second = setTimeout(() => {
        if (p.getPlayerState() !== PLAYING) blocked.current?.();
      }, 1500);
    }, 1500);

    // 클립 끝에 닿으면 처음으로. 잡힌 시간이 클립보다 길다
    const loop = setInterval(() => {
      if (endSec == null) return;
      if (p.getCurrentTime() >= endSec - 0.3) p.seekTo(startSec, true);
    }, 300);

    return () => {
      clearTimeout(first);
      clearTimeout(second);
      clearInterval(loop);
    };
  }, [ready, playing, startSec, endSec]);

  if (failed) {
    return (
      <div className="bg-sub grid aspect-video w-full place-content-center gap-1 rounded-2xl px-6 text-center">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="text-caption text-ink-soft">영상을 못 불러왔어요</p>
      </div>
    );
  }

  return (
    <div className="bg-ink relative overflow-hidden rounded-2xl">
      <div className="aspect-video w-full">
        <iframe
          ref={frame}
          title={`${title} 시범 영상`}
          src={embedSrc(videoId, startSec)}
          allow="autoplay; encrypted-media; picture-in-picture; compute-pressure"
          allowFullScreen
          className="size-full border-0"
        />
      </div>

      {/* 유튜브 스크립트를 받는 동안. 회색 상자로 멈춰 있으면 아이는 고장으로 본다 */}
      {!ready && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- 유튜브 썸네일은 외부 주소라 최적화가 안 된다 */}
          <img
            src={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`}
            alt=""
            className="size-full object-cover opacity-70"
          />
          <span className="text-caption bg-ink/60 absolute right-3 bottom-3 rounded-full px-2.5 py-1 font-bold text-white">
            영상을 불러오는 중
          </span>
        </div>
      )}

      {muted && playing && (
        <button
          type="button"
          onClick={() => {
            player.current?.unMute();
            setMuted(false);
          }}
          className="press bg-ink/65 absolute top-2 right-2 flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-white"
        >
          <Volume2 aria-hidden className="size-4" />
          소리 켜기
        </button>
      )}
    </div>
  );
}
