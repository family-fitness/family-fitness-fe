"use client";

import { ExternalLink, RefreshCw, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { afterFileFailure, fileType, watchHref } from "@/lib/videos";

/*
  운동 한 칸의 시범 영상.

  **영상이 운동의 길이를 정하지 않는다.** 타이머가 정한다(9/23 회의 — "무조건 시간으로").
  클립은 1분 남짓인데 잡힌 시간이 4분이면, 타이머가 도는 동안 클립을 되풀이한다.
  그래서 이 플레이어는 스스로 끝나지 않고, 위에서 `playing` 으로 켜고 끈다.

  자동 재생이 막히는 경우가 있다. 한 칸을 끝내고 다음 칸으로 스스로 넘어갈 때는
  누른 손가락이 없어서, 브라우저(특히 아이폰)가 소리 있는 재생을 막는다. 그러면 소리를
  끄고 다시 틀고, 그래도 안 되면 위에 알린다(`onBlocked`) — 타이머를 멈추고 「눌러서 시작」.

  영상은 두 곳에서 온다. 국민체력100 유튜브 영상의 한 토막(`videoId` + 구간)과, 공단 오픈API
  「국민체력100 동영상 정보」 의 mp4 한 편(`mediaUrl`)이다. mp4 가 오면 `<video>` 로 튼다 —
  유튜브 스크립트를 받지 않는다. 켜고 끄기 · 구간 되풀이 · 막히면 소리 끄고 다시 · 그래도 막히면
  알리기는 둘이 똑같다.
*/

/**
  유튜브 플레이어는 iframe 과 말(postMessage)로만 부린다 — 유튜브 스크립트(iframe_api)를 우리 화면에 들이면
  그 스크립트가 저장소의 토큰 · 아이 사진을 읽을 수 있다(9/30 보안 점검). 말은 유튜브가 자기 스크립트로 주고받는
  것과 같다: 「듣고 있어요」 로 붙고, 명령(command)을 보내고, 상태(infoDelivery · onStateChange)를 받는다.
*/
const YT_ORIGIN = "https://www.youtube-nocookie.com";

/** 유튜브 플레이어 상태 — 끝남 · 재생 중 · 받는 중 */
const ENDED = 0;
const PLAYING = 1;
const BUFFERING = 3;

/** 붙지 못한 채 이만큼 지나면 못 불러온 것으로 본다 — 막힌 곳(학교 망 등)에서 썸네일만 영영 서 있지 않게 */
const GIVE_UP_MS = 20_000;

interface YtMessage {
  event?: string;
  info?: unknown;
}

/** 우리가 만드는 임베드 주소. 끝(end)은 넣지 않는다 — 되풀이를 우리가 하기 때문이다 */
function embedSrc(videoId: string, startSec: number): string {
  // 유튜브 조작(멈춤 · 넘기기 · 자판)은 두지 않는다 — 켜고 끄는 것은 타이머다. 영상을 눌러 멈추면 타이머는 흐르는데
  // 영상만 멈춰 서고, 시작 전에 누르면 타이머 없이 클립 끝을 넘어 원래 영상으로 흘렀다(9/30 점검)
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    start: String(Math.floor(startSec)),
  });
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  // 아이가 보는 영상이라 쿠키를 남기지 않는 주소로(9/30 보안 점검) — 조종은 말(postMessage)로만 한다
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;
}

interface PlayerProps {
  videoId: string;
  startSec: number;
  /** 없으면 영상 끝까지가 한 칸이다 */
  endSec: number | null;
  /** 타이머가 도는 동안 true */
  playing: boolean;
  title: string;
  /** 소리를 꺼도 재생이 안 됐다 */
  onBlocked?: () => void;
  /** 못 틀었을 때 「다른 영상 보기」. 없으면 그 단추를 두지 않는다 */
  onOther?: () => void;
}

/** 대신 틀 수 있는 영상 한 편 — 같은 동작의 다른 클립 */
export interface AlternateClip {
  videoId: string;
  startSec?: number | null;
  endSec?: number | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
}

export function ClipPlayer({
  mediaUrl,
  thumbnailUrl,
  alternates = [],
  ...props
}: Omit<PlayerProps, "onOther"> & {
  /** 공단 mp4 주소. 있으면 유튜브가 아니라 이 파일을 튼다 */
  mediaUrl?: string | null;
  /** 공단 영상의 장면 이미지. 유튜브는 비어 있고 유튜브 썸네일을 쓴다 */
  thumbnailUrl?: string | null;
  /**
   * 이 영상을 못 틀면 대신 틀 영상들(앞에서부터). 비어 있으면 「다른 영상 보기」 를 두지 않는다.
   * 공단 mp4 일부는 Content-Type 이 video/mg4 로 와서 iPhone Safari 가 열지 못한다
   */
  alternates?: readonly AlternateClip[];
}) {
  // 몇 번째 대신 영상을 트는가. 칸이 바뀌면(videoId) 처음 영상으로 돌아간다
  const [swap, setSwap] = useState<{ from: string; index: number } | null>(null);
  const index = swap?.from === props.videoId ? swap.index : 0;
  const all: AlternateClip[] = [
    {
      videoId: props.videoId,
      startSec: props.startSec,
      endSec: props.endSec,
      mediaUrl,
      thumbnailUrl,
    },
    ...alternates.filter((a) => a.videoId !== props.videoId),
  ];
  const current = all[Math.min(index, all.length - 1)];
  const onOther =
    index + 1 < all.length ? () => setSwap({ from: props.videoId, index: index + 1 }) : undefined;
  const shown = {
    ...props,
    videoId: current.videoId,
    startSec: current.startSec ?? 0,
    endSec: current.endSec ?? null,
    onOther,
  };
  if (current.mediaUrl)
    return (
      <FilePlayer
        key={current.mediaUrl}
        {...shown}
        src={current.mediaUrl}
        poster={current.thumbnailUrl ?? null}
      />
    );
  return <YoutubePlayer key={current.videoId} {...shown} />;
}

/**
 * 영상을 못 틀었을 때 — 빈 화면 대신 까닭 한 줄, 새 창으로 열기, 다른 영상이 있으면 다른 영상 보기.
 * 새 창으로 여는 곳: 유튜브는 유튜브 주소, 공단 mp4 는 앱 안 영상 화면(`/watch`). mp4 주소를 새 창으로 바로 열면
 * video/mg4 로 온 파일을 브라우저가 영상인 줄 몰라 내려받는다. 새 창이라 이 화면의 운동(타이머)은 그대로 남는다
 */
function PlayFailed({ href, onOther }: { href: string; onOther?: () => void }) {
  return (
    <div role="alert" className="bg-sub rounded-2xl px-4 py-4 text-center">
      <p className="text-sm font-extrabold">이 기기에서 영상을 열지 못했어요</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="press bg-paper text-signal-deep flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-extrabold"
        >
          <ExternalLink aria-hidden className="size-4" />새 창으로 열기
        </a>
        {onOther && (
          <button
            type="button"
            onClick={onOther}
            className="press bg-signal-strong flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-extrabold text-white"
          >
            <RefreshCw aria-hidden className="size-4" />
            다른 영상 보기
          </button>
        )}
      </div>
    </div>
  );
}

/** 유튜브 영상의 한 토막 */
function YoutubePlayer({
  videoId,
  startSec,
  endSec,
  playing,
  title,
  onBlocked,
  onOther,
}: PlayerProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  /** 받은 상태 — 재생 중인지 · 몇 초인지. 유튜브가 바뀔 때마다 알려 준다 */
  const playerState = useRef(-1);
  const currentTime = useRef(0);
  const [ready, setReady] = useState(false);
  /** 지금 정말 돌고 있나 — 「소리 켜기」 는 돌 때만 */
  const [rolling, setRolling] = useState(false);
  /** 못 받은 썸네일(막힌 망) — 깨진 그림 표시 대신 남색 틀만 둔다 */
  const [thumbFailed, setThumbFailed] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(false);

  const blocked = useRef(onBlocked);
  useEffect(() => {
    blocked.current = onBlocked;
  }, [onBlocked]);

  /** 플레이어에게 한마디 — 붙기 전에 보낸 말은 사라진다 */
  const send = (func: string, args: unknown[] = []) => {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args, id: 1, channel: "widget" }),
      YT_ORIGIN,
    );
  };

  // 플레이어에 붙기. 영상이 바뀔 때만
  useEffect(() => {
    let attached = false;
    const target = () => frame.current?.contentWindow ?? null;
    const say = (message: object) =>
      target()?.postMessage(JSON.stringify({ ...message, id: 1, channel: "widget" }), YT_ORIGIN);

    const onMessage = (e: MessageEvent) => {
      // 이 iframe 이 보낸 유튜브의 말만 — 다른 창 · 다른 출처의 말은 듣지 않는다
      if (e.origin !== YT_ORIGIN || e.source !== target()) return;
      let message: YtMessage;
      try {
        message = (typeof e.data === "string" ? JSON.parse(e.data) : e.data) as YtMessage;
      } catch {
        return;
      }
      switch (message.event) {
        case "onReady":
          if (!attached) {
            attached = true;
            // 상태가 바뀔 때 · 못 틀 때 알려 달라고
            say({ event: "command", func: "addEventListener", args: ["onStateChange"] });
            say({ event: "command", func: "addEventListener", args: ["onError"] });
            setReady(true);
          }
          break;
        case "initialDelivery":
        case "infoDelivery": {
          const info = message.info as { playerState?: number; currentTime?: number } | null;
          if (typeof info?.playerState === "number") {
            playerState.current = info.playerState;
            setRolling(info.playerState === PLAYING);
          }
          if (typeof info?.currentTime === "number") currentTime.current = info.currentTime;
          break;
        }
        case "onStateChange":
          if (typeof message.info === "number") {
            playerState.current = message.info;
            setRolling(message.info === PLAYING);
            // 영상 끝까지 가 버렸으면 클립 처음으로
            if (message.info === ENDED)
              say({ event: "command", func: "seekTo", args: [startSec, true] });
          }
          break;
        case "onError":
          // 비공개 · 삭제 · 임베드 금지. 유튜브의 검은 상자를 그대로 두지 않는다
          setFailed(true);
          break;
      }
    };
    window.addEventListener("message", onMessage);
    // 붙을 때까지 「듣고 있어요」 — iframe 이 뜨기 전에 보낸 말은 사라진다
    const hello = setInterval(() => {
      if (attached) clearInterval(hello);
      else say({ event: "listening" });
    }, 250);
    const giveUp = setTimeout(() => {
      if (!attached) setFailed(true);
    }, GIVE_UP_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(hello);
      clearTimeout(giveUp);
      playerState.current = -1;
      currentTime.current = 0;
      setReady(false);
      setRolling(false);
    };
  }, [videoId, startSec]);

  // 켜고 끄기 · 되풀이. 못 불러온 영상은 건드리지 않는다 — 준비된 뒤에 막히면(비공개 · 임베드 금지)
  // 보는 고리가 막힌 재생으로 읽어 아이의 타이머를 세웠다
  useEffect(() => {
    if (!ready || failed) return;
    if (!playing) {
      send("pauseVideo");
      return;
    }

    send("playVideo");
    /*
      막혔나 본다. 소리를 끄고 한 번 더, 그래도 안 되면 위에 알린다.
      받는 중(BUFFERING)은 막힌 것이 아니다 — 느린 망에서 소리를 끄고 아이의 타이머를 멈추지 않게 조금 더
      기다려 본다. 전에는 받는 중이면 거기서 보기를 그만둬, 받다가 멈춰 선 영상을 아무도 몰랐다
    */
    let waits = 0;
    let quiet = false;
    let check: ReturnType<typeof setTimeout> | undefined;
    const look = () => {
      const state = playerState.current;
      if (state === PLAYING) return;
      if (state === BUFFERING && waits < 4) {
        waits += 1;
        check = setTimeout(look, 1500);
        return;
      }
      if (!quiet) {
        quiet = true;
        send("mute");
        setMuted(true);
        send("playVideo");
        check = setTimeout(look, 1500);
        return;
      }
      blocked.current?.();
    };
    check = setTimeout(look, 1500);

    // 클립 끝에 닿으면 처음으로. 잡힌 시간이 클립보다 길다
    const loop = setInterval(() => {
      if (endSec == null) return;
      if (currentTime.current >= endSec - 0.3) {
        currentTime.current = startSec;
        send("seekTo", [startSec, true]);
      }
    }, 300);

    return () => {
      clearTimeout(check);
      clearInterval(loop);
    };
  }, [ready, playing, startSec, endSec, failed]);

  // 못 불러오면 — 동작 이름은 위(칸 · 시트 제목)에 있다. 영상 크기의 빈 상자를 세워 두지 않는다
  if (failed) {
    return (
      <PlayFailed
        href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${Math.floor(startSec)}s`}
        onOther={onOther}
      />
    );
  }

  // 틀은 남색 — 검정으로 면을 채우지 않는다. 스크립트를 받는 동안 썸네일이 그 위에 흐리게 선다
  return (
    <div className="bg-signal-deep relative overflow-hidden rounded-2xl">
      <div className="aspect-video w-full">
        <iframe
          ref={frame}
          title={`${title} 시범 영상`}
          src={embedSrc(videoId, startSec)}
          allow="autoplay; encrypted-media; picture-in-picture; compute-pressure"
          allowFullScreen
          // 누름은 영상에 닿지 않는다 — 켜고 끄는 것은 위의 시작 · 멈춤 단추다
          className="pointer-events-none size-full border-0"
        />
      </div>

      {/* 플레이어가 붙는 동안 — 남색 덮개 위에 그 영상의 썸네일이 자리를 잡는다. 회색 상자로 멈춰 있으면 아이는 고장으로 본다.
          썸네일을 못 받아도(막힌 망) 덮개는 남긴다 — 걷으면 그 밑 iframe 의 브라우저 오류 그림이 드러났다 */}
      {!ready && (
        <div className="bg-signal-deep absolute inset-0" aria-hidden>
          {thumbFailed !== videoId && (
            // eslint-disable-next-line @next/next/no-img-element -- 유튜브 썸네일은 외부 주소라 최적화가 안 된다
            <img
              src={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`}
              alt=""
              onError={() => setThumbFailed(videoId)}
              className="size-full object-cover opacity-70"
            />
          )}
        </div>
      )}

      {/* 소리를 끄고 돌고 있을 때만 — 막혀 멈춰 선 영상 위에는 켤 소리가 없다 */}
      {muted && playing && rolling && (
        <UnmuteButton
          onClick={() => {
            send("unMute");
            setMuted(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * 공단 mp4 한 편. 한 편에 운동 하나(1~2분)라 보통 처음부터 끝까지가 한 칸이지만,
 * 구간(`startSec` ~ `endSec`)이 오면 유튜브처럼 그 구간만 되풀이한다.
 */
function FilePlayer({
  src,
  poster,
  startSec,
  endSec,
  playing,
  title,
  onBlocked,
  onOther,
}: Omit<PlayerProps, "videoId"> & { src: string; poster: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  // 못 튼 파일을 기억한다 — 같은 자리에 다른 영상이 오면(시범 보기에서 다른 동작을 누르면) 다시 틀어 본다
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const failed = failedSrc === src;
  // 이 주소를 몇 번 다시 불렀나. error 와 stalled 가 잇달아 와도 한 번만 다시 부르게 ref 로 센다.
  // reloads 는 다시 부른 뒤 아래 재생 effect 를 한 번 더 돌리려고 둔다 — load() 는 재생을 멈춘다
  const tries = useRef<{ src: string; reloads: number }>({ src, reloads: 0 });
  const [reloads, setReloads] = useState(0);

  const blocked = useRef(onBlocked);
  useEffect(() => {
    blocked.current = onBlocked;
  }, [onBlocked]);
  const running = useRef(playing);
  useEffect(() => {
    running.current = playing;
  }, [playing]);

  // 켜고 끄기. 막히면(NotAllowedError) 소리를 끄고 한 번 더, 그래도 막히면 위에 알린다.
  // 받는 중에는 play() 가 기다릴 뿐 실패하지 않는다 — 느린 망을 막힌 것으로 읽지 않는다
  useEffect(() => {
    const v = video.current;
    if (!v || failed) return;
    if (!playing) {
      v.pause();
      return;
    }
    let cancelled = false;
    const notAllowed = (e: unknown) => e instanceof DOMException && e.name === "NotAllowedError";
    v.play().catch((e: unknown) => {
      // 멈추기 · 파일 오류로 끊긴 것은 막힌 게 아니다. 파일 오류는 onError 가 받는다
      if (cancelled || !notAllowed(e)) return;
      v.muted = true;
      setMuted(true);
      v.play().catch((again: unknown) => {
        if (!cancelled && notAllowed(again)) blocked.current?.();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [playing, failed, src, reloads]);

  // 클립의 처음으로. 구간이 없는 한 편이면 0초다
  const rewind = () => {
    const v = video.current;
    if (v) v.currentTime = startSec;
  };

  /*
    못 틀었다(error) · 받다가 멈춰 섰다(stalled). 공단 서버 두 대 가운데 한 대가 Content-Type 을
    video/mg4 로 주는데(요청마다 절반 확률) iPhone Safari 는 그 파일을 못 연다. 같은 주소를 한 번만
    다시 불러 보고, 두 번째도 안 되면 실패 안내를 띄운다
  */
  const fail = () => {
    if (tries.current.src !== src) tries.current = { src, reloads: 0 };
    const v = video.current;
    if (v && afterFileFailure(tries.current.reloads) === "reload") {
      tries.current.reloads += 1;
      v.load();
      setReloads((n) => n + 1);
      return;
    }
    setFailedSrc(src);
  };

  // 형식(iPhone Safari 가 video/mg4 로 온 파일을 못 연다) · 네트워크 오류 모두 여기로 온다
  if (failed) return <PlayFailed href={watchHref(src, title) ?? src} onOther={onOther} />;

  return (
    <div className="bg-signal-deep relative overflow-hidden rounded-2xl">
      <video
        ref={video}
        poster={poster ?? undefined}
        title={`${title} 시범 영상`}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className="aspect-video w-full"
        onLoadedMetadata={() => {
          if (startSec > 0) rewind();
        }}
        // 클립 끝에 닿으면 처음으로. 잡힌 시간이 클립보다 길다
        onTimeUpdate={(e) => {
          if (endSec != null && e.currentTarget.currentTime >= endSec - 0.3) rewind();
        }}
        // 파일 끝까지 가 버렸으면 처음으로 — 타이머가 도는 동안은 다시 튼다
        onEnded={(e) => {
          rewind();
          if (running.current) e.currentTarget.play().catch(() => {});
        }}
        onError={fail}
        // 받은 것이 하나도 없을 때만 실패로 본다. 틀던 영상이 느린 망에서 잠깐 멈춘 것까지 안내로 덮지 않는다
        onStalled={(e) => {
          if (e.currentTarget.readyState === HTMLMediaElement.HAVE_NOTHING) fail();
        }}
      >
        {/* 파일을 못 열면 error 는 video 가 아니라 이 source 에 온다 */}
        <source src={src} type={fileType(src)} onError={fail} />
      </video>

      {muted && playing && (
        <UnmuteButton
          onClick={() => {
            if (video.current) video.current.muted = false;
            setMuted(false);
          }}
        />
      )}
    </div>
  );
}

function UnmuteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press bg-signal-deep/80 absolute top-2 right-2 flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-white"
    >
      <Volume2 aria-hidden className="size-4" />
      소리 켜기
    </button>
  );
}
