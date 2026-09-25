"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * 소리 안내 — 운동하는 동안 화면을 안 봐도 되게 말로 알려 준다(나이키 트레이닝 클럽 · 삼성헬스 운동 코칭).
 *
 * 브라우저가 가진 목소리(speechSynthesis · 한국어)로 짧게만: 「스쿼트 시작!」 「10초 남았어요」
 * 「셋 · 둘 · 하나」 「잘했어요, 다음은 …」. 목소리가 없는 기기에서는 조용히 넘어간다.
 * 새 말이 오면 앞의 말은 끊는다 — 밀린 말이 줄줄이 나오면 지금과 안 맞는다.
 */
function voiceOf(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "ko-KR") ?? voices.find((v) => v.lang.startsWith("ko")) ?? null
  );
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  const voice = voiceOf();
  if (voice) u.voice = voice;
  u.rate = 1.05;
  u.pitch = 1.1;
  synth.speak(u);
}

/** 켜져 있을 때만 말한다. 화면을 떠나면 하던 말을 끊는다 */
export function useVoice(enabled: boolean) {
  const on = useRef(enabled);
  useEffect(() => {
    on.current = enabled;
    if (!enabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [enabled]);
  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [],
  );
  const say = useCallback((text: string) => {
    if (on.current) speak(text);
  }, []);
  return useMemo(() => ({ say }), [say]);
}
