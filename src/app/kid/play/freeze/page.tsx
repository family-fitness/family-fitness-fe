"use client";

import { Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { FreezeStage } from "@/components/scene/freeze-stage";
import { useProgress } from "@/lib/api/queries";
import { useBeat } from "@/lib/beat";
import { stageOf } from "@/lib/levels";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";

/**
 * 얼음땡 — 박자에 맞춰 움직이다가 「얼음!」 이면 그대로 멈춘다. 「땡!」 이면 다시.
 *
 * 폰은 심판이고 몸이 논다. 가족이 같이 하기 좋은 놀이라 누가 먼저 움직였는지는
 * 사람끼리 본다 — 화면은 점수를 매기지 않는다. 얼음 여섯 번이면 한 판.
 * 멈출 때까지 기다리는 시간은 매번 다르다(5~10초) — 언제 올지 몰라야 재밌다.
 */
type Phase = "ready" | "dance" | "frozen" | "thaw" | "end";

const ROUNDS = 6;

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function FreezePage() {
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: progress } = useProgress(childProfileId ?? undefined);
  const beat = useBeat();
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(0);
  const [muted, setMuted] = useState(false);

  // 다음 차례로 — 춤(5~10초) → 얼음(3~4.5초) → 땡(0.9초) → 춤 …
  useEffect(() => {
    if (phase === "dance") {
      const id = setTimeout(
        () => {
          beat.stop();
          beat.freeze();
          setPhase("frozen");
        },
        between(5000, 10000),
      );
      return () => clearTimeout(id);
    }
    if (phase === "frozen") {
      const id = setTimeout(
        () => {
          beat.thaw();
          setCount((c) => c + 1);
          setPhase("thaw");
        },
        between(3000, 4500),
      );
      return () => clearTimeout(id);
    }
    if (phase === "thaw") {
      const id = setTimeout(() => {
        if (count >= ROUNDS) {
          setPhase("end");
          return;
        }
        beat.start();
        setPhase("dance");
      }, 900);
      return () => clearTimeout(id);
    }
  }, [phase, count, beat]);

  // 다른 앱으로 가면 멈춘다. 돌아와서 다시 시작
  useEffect(() => {
    const onHide = () => {
      if (!document.hidden) return;
      beat.stop();
      setPhase((p) => (p === "end" ? p : "ready"));
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [beat]);

  const start = () => {
    beat.start();
    beat.setMuted(muted);
    setCount(0);
    setPhase("dance");
  };
  const quit = () => {
    beat.stop();
    setPhase("ready");
  };
  const toggleSound = () => {
    setMuted((m) => {
      beat.setMuted(!m);
      return !m;
    });
  };

  const playing = phase === "dance" || phase === "frozen" || phase === "thaw";

  return (
    <>
      <AppBar backHref="/kid/play" title="얼음땡" />
      <Stage wide className="space-y-3">
        <section className="card-hero text-center">
          <FreezeStage
            stage={stageOf(progress?.level).stage}
            mode={playing ? phase : "idle"}
            phase={beat.phase}
            height={250}
            className="-mt-2"
          />

          <div aria-live="assertive" className="flex min-h-28 flex-col items-center justify-center">
            {phase === "ready" && (
              <>
                <p className="text-lead font-extrabold">음악이 나오면 신나게 움직여요</p>
                <p className="text-body text-ink-soft mt-1 font-bold">「얼음!」 이면 멈춰요</p>
              </>
            )}
            {phase === "dance" && (
              <p className="text-signal-deep text-metric-lg font-extrabold">움직여요!</p>
            )}
            {phase === "frozen" && (
              <>
                <p className="text-signal-deep text-metric-lg font-extrabold">얼음!</p>
                <p className="text-caption text-ink-soft font-bold">그대로 멈춰요</p>
              </>
            )}
            {phase === "thaw" && <p className="text-metric-lg font-extrabold">땡!</p>}
            {phase === "end" && (
              <>
                <p className="text-lead font-extrabold">얼음 {ROUNDS}번, 한 판 끝!</p>
              </>
            )}
          </div>

          {/* 얼음 몇 번째인지 — 점수가 아니라 한 판이 어디쯤인지 */}
          <div className="mt-2 flex justify-center gap-1.5" aria-label={`얼음 ${count}번 했어요`}>
            {Array.from({ length: ROUNDS }, (_, i) => (
              <span
                key={i}
                className={cn("size-2.5 rounded-full", i < count ? "bg-signal" : "bg-bar")}
              />
            ))}
          </div>

          {playing ? (
            <button
              type="button"
              onClick={quit}
              className="press bg-sub mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold"
            >
              그만하기
            </button>
          ) : (
            <button
              type="button"
              onClick={start}
              className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white"
            >
              <Play aria-hidden className="size-5 fill-current" />
              {phase === "end" ? "한 판 더" : "시작하기"}
            </button>
          )}
        </section>

        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          className="press text-ink-soft mx-auto flex min-h-11 items-center gap-1.5 px-4 text-sm font-bold"
        >
          {muted ? (
            <VolumeX aria-hidden className="size-4" />
          ) : (
            <Volume2 aria-hidden className="size-4" />
          )}
          {muted ? "소리 꺼짐 · 켜기" : "소리 켜짐 · 끄기"}
        </button>
      </Stage>
    </>
  );
}
