"use client";

import { useEffect, useRef, useState } from "react";

import { NavLink } from "@/components/ui/nav-link";
import { Illustration } from "@/components/ui/illustration";

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
  pauseVideo: () => void;
  destroy: () => void;
}

interface YtOptions {
  events?: {
    onReady?: () => void;
    onStateChange?: (e: { data: number }) => void;
    onError?: (e: { data: number }) => void;
  };
}

/** 우리가 직접 만드는 임베드 주소. `enablejsapi` 가 있어야 스크립트가 붙을 수 있다 */
function embedSrc(videoId: string, startSec?: number | null, endSec?: number | null): string {
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    start: String(startSec ?? 0),
  });
  // 유튜브 자체 end 로 한 겹 더 막는다. 우리 타이머가 늦어도 여기서 선다
  if (endSec != null) params.set("end", String(Math.ceil(endSec)));
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params}`;
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
  endSec,
  onProgress,
  onClipEnd,
}: {
  videoId: string;
  startSec?: number | null;
  /**
   * 구간의 끝(초). **있으면 여기서 멈춘다.**
   *
   * 운동처방 하나는 영상 한 편이 아니라 영상 안의 한 토막이다. 끝에서 안 멈추면
   * 아이가 다음 운동 영상을 그대로 이어 본다 — 코치가 짜지 않은 운동이다.
   */
  endSec?: number | null;
  /**
   * 진행률과 본 초. 재생 중 5초마다, 그리고 끝날 때 한 번.
   *
   * 구간이면 **구간 기준 진행률과 구간 안에서 본 초**를 준다. 영상 전체가 아니다 —
   * 12분짜리의 90초 구간을 다 본 아이는 진행률 1 이어야 한다.
   */
  onProgress: (progress: number, watchedSec: number) => void;
  /** 구간 끝에 닿았을 때 한 번 */
  onClipEnd?: () => void;
}) {
  const holder = useRef<HTMLIFrameElement>(null);
  const player = useRef<YtPlayer | null>(null);
  const reported = useRef(0);
  /** 구간 끝을 한 번만 알린다 */
  const ended = useRef(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // onProgress 가 매 렌더 새 함수여도 플레이어를 다시 만들지 않게 붙들어 둔다
  const report = useRef(onProgress);
  const clipEnd = useRef(onClipEnd);
  useEffect(() => {
    report.current = onProgress;
    clipEnd.current = onClipEnd;
  }, [onProgress, onClipEnd]);

  useEffect(() => {
    let cancelled = false;
    let ticker: ReturnType<typeof setInterval> | undefined;

    loadApi()
      .then(() => {
        if (cancelled || !holder.current || !window.YT) return;

        /*
          iframe 을 우리가 만들어 두고 거기에 붙인다.

          스크립트가 만들게 두면 `allow` 를 우리가 정할 수 없다. 문서에 열어 준
          기능(compute-pressure)은 **iframe 의 allow 로 다시 넘겨줘야** 안쪽까지
          닿는다 — 안 넘기면 영상 화면마다 권한 위반 경고가 뜨고, 저사양 기기가
          화질을 못 내린다.
        */
        player.current = new window.YT.Player(holder.current, {
          events: {
            // 플레이어가 준비되기 전까지는 빈 상자다. 그동안 뭘 하고 있는지 말해 준다
            onReady: () => setReady(true),
            /*
              비공개·삭제·임베드 금지 영상. 유튜브가 검은 상자에 자기 문구를
              띄우고 마는데, 그러면 아이는 앱이 고장 난 줄 안다.
            */
            onError: () => setFailed(true),
            onStateChange: (e) => {
              const playing = e.data === window.YT?.PlayerState.PLAYING;
              clearInterval(ticker);
              if (!playing) {
                if (e.data === window.YT?.PlayerState.ENDED) send();
                return;
              }
              // 구간이면 끝을 놓치지 않게 촘촘히 본다. 5초면 최대 5초를 넘겨 재생한다
              ticker = setInterval(send, endSec != null ? 500 : 5000);
            },
          },
        });
      })
      .catch(() => setFailed(true));

    /**
     * 얼마나 왔는지 알린다.
     *
     * **구간이면 구간 기준으로 잰다.** 영상 전체로 재면 12분짜리의 90초 구간을
     * 다 본 아이가 12%로 찍히고, 90% 문턱에 영원히 못 닿는다.
     */
    function send() {
      const p = player.current;
      if (!p) return;
      const at = p.getCurrentTime();
      const from = startSec ?? 0;

      if (endSec != null && endSec > from) {
        const watched = Math.max(0, Math.min(endSec, at) - from);
        const progress = Math.min(1, watched / (endSec - from));
        if (progress > reported.current) {
          reported.current = progress;
          report.current(progress, Math.round(watched));
        }
        // 구간 끝에 닿으면 멈춘다. 다음 운동으로 그냥 넘어가게 두지 않는다
        if (at >= endSec) {
          clearInterval(ticker);
          p.pauseVideo();
          if (!ended.current) {
            ended.current = true;
            clipEnd.current?.();
          }
        }
        return;
      }

      const duration = p.getDuration();
      if (!duration) return;
      const progress = Math.min(1, at / duration);
      // 뒤로 감아도 최대치만 의미가 있다. 서버도 최대 진행률만 남긴다
      if (progress <= reported.current) return;
      reported.current = progress;
      report.current(progress, Math.round(at));
    }

    return () => {
      cancelled = true;
      clearInterval(ticker);
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId, startSec, endSec]);

  /*
    비공개·삭제·임베드 금지, 또는 스크립트를 못 받았을 때.

    아이가 보는 화면이라 **막다른 길로 두지 않는다** — 다른 운동을 고르러
    가는 큰 길 하나와, 되는 사람을 위한 바깥 링크 하나를 둔다.
  */
  if (failed) {
    return (
      <div className="border-line flex flex-col items-center rounded-2xl border border-dashed px-4 py-6 text-center">
        <Illustration name="scene/scene-no-video" size={110} />
        <p className="mt-3 text-lg font-extrabold">지금은 이 영상을 못 봐요</p>
        <NavLink
          href="/kid/pick"
          className="press bg-signal mt-4 w-full rounded-2xl py-3.5 text-base font-extrabold text-white"
        >
          다른 운동 고르기
        </NavLink>
        <a
          href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-ink-soft mt-1 inline-flex min-h-11 items-center px-3 text-sm font-bold underline underline-offset-2"
        >
          유튜브에서 열기
        </a>
      </div>
    );
  }

  return (
    <div className="bg-sub relative overflow-hidden rounded-2xl">
      <div className="aspect-video w-full max-w-full">
        <iframe
          ref={holder}
          title="운동 영상"
          src={embedSrc(videoId, startSec, endSec)}
          allow="autoplay; encrypted-media; picture-in-picture; compute-pressure"
          allowFullScreen
          className="size-full border-0"
        />
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
