"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 얼음땡의 박자 — 파일 없이 브라우저가 소리를 지어 낸다(Web Audio).
 *
 * 쿵(킥) · 칙(하이햇) · 띠(짧은 멜로디) 셋만. 밝고 단순하게 116 BPM.
 * 소리는 **누른 순간에만** 켤 수 있다(브라우저 자동 재생 규칙) — 시작 버튼이 켠다.
 *
 * `phase()` 는 지금 박자 안에서 어디쯤인지(0~1). 화면의 키움이가 이걸 보고 박자에 맞춰 뛴다.
 */
const BPM = 116;
/** 8분음표 한 칸(초) */
const STEP = 60 / BPM / 2;
/** 도 · 레 · 미 · 솔 · 라 — 무엇을 눌러도 어울리는 다섯 음 */
const NOTES = [523.25, 587.33, 659.25, 783.99, 880];
/** 16칸 멜로디. -1 은 쉼 */
const MELODY = [0, -1, 2, -1, 4, -1, 3, -1, 2, -1, 4, 3, 1, -1, 0, -1];

export interface Beat {
  start(): void;
  stop(): void;
  /** 얼음! — 내려가는 소리 */
  freeze(): void;
  /** 땡! — 맑은 종소리 */
  thaw(): void;
  /** 지금 박자 안의 자리(0~1). 멈춰 있으면 null */
  phase(): number | null;
  setMuted(muted: boolean): void;
  close(): void;
}

export function createBeat(): Beat | null {
  const Context =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Context) return null;
  const ctx = new Context();
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  // 하이햇에 쓸 잡음 한 토막
  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const kick = (at: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    gain.gain.setValueAtTime(0.9, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + 0.21);
  };
  const hat = (at: number) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    src.connect(filter).connect(gain).connect(master);
    src.start(at);
    src.stop(at + 0.06);
  };
  const tone = (at: number, freq: number, length: number, volume: number, type: OscillatorType) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + length + 0.02);
    return osc;
  };

  let timer: ReturnType<typeof setInterval> | null = null;
  let next = 0;
  let step = 0;
  let startedAt: number | null = null;

  const schedule = () => {
    // 100ms 앞까지 미리 깔아 둔다 — 화면이 잠깐 버벅여도 박자가 흔들리지 않게
    while (next < ctx.currentTime + 0.1) {
      if (step % 4 === 0) kick(next);
      if (step % 2 === 1) hat(next);
      const note = MELODY[step];
      if (note >= 0) tone(next, NOTES[note], 0.18, 0.12, "triangle");
      next += STEP;
      step = (step + 1) % MELODY.length;
    }
  };

  return {
    start() {
      void ctx.resume();
      if (timer) return;
      next = ctx.currentTime + 0.06;
      step = 0;
      startedAt = next;
      schedule();
      timer = setInterval(schedule, 25);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      startedAt = null;
    },
    freeze() {
      const at = ctx.currentTime + 0.01;
      const osc = tone(at, 880, 0.45, 0.2, "sine");
      osc.frequency.exponentialRampToValueAtTime(330, at + 0.4);
    },
    thaw() {
      const at = ctx.currentTime + 0.01;
      tone(at, 1318.5, 0.7, 0.22, "sine");
      tone(at + 0.08, 1760, 0.6, 0.12, "sine");
    },
    phase() {
      if (startedAt == null) return null;
      const beats = ((ctx.currentTime - startedAt) * BPM) / 60;
      return beats < 0 ? 0 : beats % 1;
    },
    setMuted(muted) {
      master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.02);
    },
    close() {
      if (timer) clearInterval(timer);
      void ctx.close();
    },
  };
}

/** 화면에서 쓰는 박자. 처음 `start` 를 부를 때(누른 순간) 소리를 짓고, 떠나면 닫는다 */
export function useBeat() {
  const beat = useRef<Beat | null>(null);
  /** 소리가 없는 기기 · 끈 소리에서도 박자는 간다 — 키움이가 계속 뛰게 */
  const quiet = useRef<number | null>(null);

  useEffect(
    () => () => {
      beat.current?.close();
      beat.current = null;
    },
    [],
  );

  const start = useCallback(() => {
    beat.current ??= createBeat();
    beat.current?.start();
    quiet.current = performance.now();
  }, []);
  const stop = useCallback(() => {
    beat.current?.stop();
    quiet.current = null;
  }, []);
  const freeze = useCallback(() => beat.current?.freeze(), []);
  const thaw = useCallback(() => beat.current?.thaw(), []);
  const setMuted = useCallback((muted: boolean) => beat.current?.setMuted(muted), []);
  const phase = useCallback(() => {
    const p = beat.current?.phase();
    if (p != null) return p;
    if (quiet.current == null) return null;
    return ((((performance.now() - quiet.current) / 1000) * BPM) / 60) % 1;
  }, []);

  return { start, stop, freeze, thaw, setMuted, phase };
}
