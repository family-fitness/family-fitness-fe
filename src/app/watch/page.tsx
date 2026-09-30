"use client";

import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { afterFileFailure, fileType, kspoVideo, watchTitle } from "@/lib/videos";

/**
 * 공단 mp4 한 편만 트는 화면 — `/watch?src=<공단 영상 주소>&title=<동작 이름>`.
 *
 * 공단 서버 두 대 가운데 한 대가 요청마다 절반 확률로 Content-Type 을 video/mg4 로 준다. 앱 안 `<video>` 는
 * 파일 내용을 보고 잘 튼다(크롬 · WebKit). 그런데 주소를 새 창으로 바로 열면 브라우저가 영상인 줄 몰라 파일로
 * 내려받았다. 그래서 근거 링크 · 재생 실패 안내의 「새 창으로 열기」 는 mp4 주소를 이 화면으로 연다.
 *
 * 로그인하지 않아도 열린다(새 창에는 로그인이 없을 수 있다). 공단 영상 주소만 튼다 — 아무 주소나 넣어
 * 여는 창이 되지 않게(`kspoVideo`).
 */
export default function WatchPage() {
  return (
    <Suspense fallback={null}>
      <Watch />
    </Suspense>
  );
}

function Watch() {
  const params = useSearchParams();
  const src = kspoVideo(params.get("src"));
  const title = watchTitle(params.get("title"));

  return (
    <>
      <AppBar back title={title} />
      <Stage wide className="space-y-3">
        {src ? (
          <FileVideo key={src} src={src} title={title} />
        ) : (
          <div role="alert" className="bg-sub rounded-2xl px-4 py-4 text-center">
            <p className="text-sm font-extrabold">열 수 없는 영상 주소예요</p>
            <p className="text-ink-soft text-caption mt-1">
              국민체력100(국민체육진흥공단) 영상만 여기서 틀 수 있어요
            </p>
          </div>
        )}
      </Stage>
    </>
  );
}

/** 못 틀면 같은 주소를 한 번 더 불러 보고(`afterFileFailure`), 그래도 안 되면 까닭 한 줄과 「파일로 받기」 */
function FileVideo({ src, title }: { src: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const reloads = useRef(0);
  const [failed, setFailed] = useState(false);

  const fail = () => {
    const v = video.current;
    if (v && afterFileFailure(reloads.current) === "reload") {
      reloads.current += 1;
      v.load();
      return;
    }
    setFailed(true);
  };

  if (failed) {
    return (
      <div role="alert" className="bg-sub rounded-2xl px-4 py-4 text-center">
        <p className="text-sm font-extrabold">이 기기에서 영상을 열지 못했어요</p>
        <p className="text-ink-soft text-caption mt-1">
          공단 서버가 가끔 영상 형식을 잘못 알려 줘요. 파일로 받아서 열어 보세요
        </p>
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="press bg-paper text-signal-deep mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-extrabold"
        >
          <Download aria-hidden className="size-4" />
          파일로 받기
        </a>
      </div>
    );
  }

  return (
    <div className="bg-signal-deep overflow-hidden rounded-2xl">
      <video
        ref={video}
        title={`${title} 영상`}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
        onError={fail}
        // 받은 것이 하나도 없을 때만 실패로 본다. 보던 영상이 느린 망에서 잠깐 멈춘 것은 실패가 아니다
        onStalled={(e) => {
          if (e.currentTarget.readyState === HTMLMediaElement.HAVE_NOTHING) fail();
        }}
      >
        {/* 파일을 못 열면 error 는 video 가 아니라 이 source 에 온다 */}
        <source src={src} type={fileType(src)} onError={fail} />
      </video>
    </div>
  );
}
