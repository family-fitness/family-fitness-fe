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
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    start: String(Math.floor(startSec)),
  });
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  // 아이가 보는 영상이라 쿠키를 남기지 않는 주소로(9/30 보안 점검) — 조종은 말(postMessage)로만 한다
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;
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
  /** 받은 상태 — 재생 중인지 · 몇 초인지. 유튜브가 바뀔 때마다 알려 준다 */
  const playerState = useRef(-1);
  const currentTime = useRef(0);
  const [ready, setReady] = useState(false);
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
          if (typeof info?.playerState === "number") playerState.current = info.playerState;
          if (typeof info?.currentTime === "number") currentTime.current = info.currentTime;
          break;
        }
        case "onStateChange":
          if (typeof message.info === "number") {
            playerState.current = message.info;
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

  // 못 불러오면 한 줄로 — 동작 이름은 위(칸 · 시트 제목)에 있다. 영상 크기의 빈 상자를 세워 두지 않는다
  if (failed) {
    return <p className="text-caption text-ink-soft py-2 text-center">영상을 못 불러왔어요</p>;
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
          className="size-full border-0"
        />
      </div>

      {/* 유튜브 스크립트를 받는 동안 — 그 영상의 썸네일이 자리를 잡는다. 회색 상자로 멈춰 있으면 아이는 고장으로 본다 */}
      {!ready && (
        <div className="absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- 유튜브 썸네일은 외부 주소라 최적화가 안 된다 */}
          <img
            src={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`}
            alt=""
            className="size-full object-cover opacity-70"
          />
        </div>
      )}

      {muted && playing && (
        <button
          type="button"
          onClick={() => {
            send("unMute");
            setMuted(false);
          }}
          className="press bg-signal-deep/80 absolute top-2 right-2 flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-white"
        >
          <Volume2 aria-hidden className="size-4" />
          소리 켜기
        </button>
      )}
    </div>
  );
}
