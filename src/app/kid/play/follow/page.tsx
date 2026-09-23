"use client";

import { Check, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { FollowStage, MOVE_SECONDS } from "@/components/scene/follow-stage";
import { useProgress } from "@/lib/api/queries";
import { stageOf } from "@/lib/levels";
import { FOLLOW_MOVES, FOLLOW_ROUNDS, extendSequence } from "@/lib/play";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";

/**
 * 따라 해 봐 — 키움이가 동작을 하나씩 해 보이면, 순서대로 기억해 따라 한다.
 * 한 판마다 하나씩 길어진다. 둘에서 시작해 여섯이면 끝.
 *
 * 잊어버려도 「한 번 더 보기」 — 틀렸다고 말하지 않는다. 화면은 따라 했는지 모른다.
 * 옆에서 보는 가족이 심판이다.
 */
type Phase = "ready" | "show" | "do" | "end";

/** 동작 사이 틈(초) — 다음 동작이 시작되는 걸 알아보게 */
const GAP = 0.35;

export default function FollowPage() {
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: progress } = useProgress(childProfileId ?? undefined);
  const [phase, setPhase] = useState<Phase>("ready");
  const [sequence, setSequence] = useState<number[]>([]);
  const [at, setAt] = useState(0);
  const [playKey, setPlayKey] = useState(0);

  // 보여 주는 동안 — 한 동작이 끝나면 다음 동작, 다 보여 주면 따라 할 차례
  useEffect(() => {
    if (phase !== "show") return;
    const id = setTimeout(
      () => {
        if (at + 1 < sequence.length) {
          setAt(at + 1);
          setPlayKey((k) => k + 1);
        } else {
          setPhase("do");
        }
      },
      (MOVE_SECONDS + GAP) * 1000,
    );
    return () => clearTimeout(id);
  }, [phase, at, sequence.length]);

  const show = (next: number[]) => {
    setSequence(next);
    setAt(0);
    setPlayKey((k) => k + 1);
    setPhase("show");
  };
  const start = () => show(extendSequence(extendSequence([])));
  const done = () => {
    if (sequence.length >= FOLLOW_ROUNDS) setPhase("end");
    else show(extendSequence(sequence));
  };

  const move = phase === "show" ? sequence[at] : null;

  return (
    <>
      <AppBar backHref="/kid/play" title="따라 해 봐" />
      <Stage wide className="space-y-3">
        <section className="card-hero text-center">
          <FollowStage
            stage={stageOf(progress?.level).stage}
            move={move ?? null}
            playKey={playKey}
            height={250}
            className="-mt-2"
          />

          <div aria-live="polite" className="flex min-h-28 flex-col items-center justify-center">
            {phase === "ready" && (
              <>
                <p className="text-lead font-extrabold">키움이가 하는 걸 잘 보고</p>
                <p className="text-lead font-extrabold">순서대로 따라 해요</p>
                <p className="text-caption text-ink-soft mt-1">한 판마다 동작이 하나씩 늘어요</p>
              </>
            )}
            {phase === "show" && move != null && (
              <>
                <p className="text-caption text-signal-deep font-extrabold">
                  잘 보세요 · {at + 1} / {sequence.length}
                </p>
                <p className="text-metric mt-1 leading-tight font-extrabold">
                  {FOLLOW_MOVES[move]}
                </p>
              </>
            )}
            {phase === "do" && (
              <>
                <p className="text-metric leading-tight font-extrabold">이제 해 봐요!</p>
                <p className="text-caption text-ink-soft mt-1">
                  {sequence.length}가지를 순서대로 · 가족이 옆에서 봐 줘요
                </p>
              </>
            )}
            {phase === "end" && (
              <>
                <p className="text-lead font-extrabold">{FOLLOW_ROUNDS}가지를 다 따라 했어요!</p>
                <p className="text-caption text-ink-soft mt-1">기억력도 몸도 쑥쑥</p>
              </>
            )}
          </div>

          {/* 이번 판이 몇 가지인지 */}
          {phase !== "ready" && (
            <div
              className="mt-2 flex justify-center gap-1.5"
              aria-label={`이번 판은 ${sequence.length}가지`}
            >
              {Array.from({ length: FOLLOW_ROUNDS }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2.5 rounded-full",
                    i < sequence.length ? "bg-signal" : "bg-bar",
                    phase === "show" && i === at && "ring-signal-deep ring-2",
                  )}
                />
              ))}
            </div>
          )}

          {phase === "ready" || phase === "end" ? (
            <button
              type="button"
              onClick={start}
              className="press bg-signal-strong mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white"
            >
              <Play aria-hidden className="size-5 fill-current" />
              {phase === "end" ? "처음부터" : "시작하기"}
            </button>
          ) : phase === "do" ? (
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={done}
                className="press bg-signal-strong flex min-h-14 items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white"
              >
                <Check aria-hidden className="size-5" strokeWidth={3} />다 했어요
              </button>
              <button
                type="button"
                onClick={() => show(sequence)}
                className="press bg-sub flex min-h-14 items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-extrabold"
              >
                <RotateCcw aria-hidden className="size-4" />한 번 더 보기
              </button>
            </div>
          ) : (
            <p className="text-caption text-ink-soft mt-4 flex min-h-14 items-center justify-center font-bold">
              키움이가 보여 주는 중이에요
            </p>
          )}
        </section>
        <p className="text-caption text-faint px-2 text-center leading-relaxed">
          뛰기 전에 주변에 부딪힐 것이 없는지 먼저 봐요
        </p>
      </Stage>
    </>
  );
}
