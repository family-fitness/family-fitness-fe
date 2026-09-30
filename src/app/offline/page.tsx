"use client";

import { useEffect } from "react";

import { PlainScreen } from "@/components/app-shell/screen";

/** 끊겼을 때 그리는 그림 — 서비스워커가 미리 받아 둔다(`public/sw.js`) */
const ART = "/assets/scene/kiumi-rest.png";

/**
 * 인터넷이 끊겼을 때.
 *
 * 그림은 next/image 를 거치지 않고 파일을 그대로 부른다 — `/_next/image` 는 워커가 저장하지 않아
 * 끊긴 채로 열면 글자만 남았다.
 *
 * 워커는 가려던 주소 그대로 이 화면을 내준다. 그래서 다시 불러오면 가려던 화면으로 간다.
 * 전에는 다시 시도할 길이 없어 앱을 껐다 켜야 했다. 망이 돌아오면 스스로 다시 부른다.
 */
export default function OfflinePage() {
  const retry = () => {
    // 이 주소로 바로 들어왔으면(가려던 곳이 없으면) 처음 화면으로
    if (window.location.pathname === "/offline") window.location.replace("/");
    else window.location.reload();
  };

  useEffect(() => {
    const onOnline = () => {
      if (window.location.pathname === "/offline") window.location.replace("/");
      else window.location.reload();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- 끊긴 채로도 떠야 한다. 워커가 받아 둔 파일 그대로 */}
      <img src={ART} alt="" width={150} height={150} className="object-contain" />
      <h1 className="page-title">인터넷이 끊겼어요</h1>
      <p className="text-caption text-ink-soft">연결되면 다시 불러와요</p>
      {/* 단추가 아니라 같은 주소로 가는 링크 — 이 화면의 스크립트를 워커가 아직 안 받아 뒀어도 눌린다 */}
      <a
        href="?"
        onClick={(e) => {
          e.preventDefault();
          retry();
        }}
        className="press bg-signal-strong mt-2 inline-flex min-h-12 items-center rounded-2xl px-6 text-base font-extrabold text-white"
      >
        다시 해 볼래요
      </a>
    </PlainScreen>
  );
}
