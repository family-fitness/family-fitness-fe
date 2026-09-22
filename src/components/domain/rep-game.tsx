"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { KidCharacter, type Motion } from "@/components/domain/kid-character";
import { TapBurst, type TapBurstHandle } from "@/components/scene/tap-burst";
import { cn } from "@/lib/utils";

/** 1분 운동 놀이. */
const ROUND_SEC = 60;

/** 배열을 컴포넌트 밖에 둔다. */
const BURST_ASSETS = ["deco/deco-star", "deco/deco-sparkle", "deco/deco-confetti"];

const MOTIONS: { key: Motion; label: string; hint: string }[] = [
  { key: "jump", label: "점프", hint: "제자리에서 폴짝!" },
  { key: "squat", label: "앉았다 일어서기", hint: "천천히 앉았다 일어나요" },
  { key: "stretch", label: "쭉 펴기", hint: "팔을 위로 쭉!" },
];

export function RepGame({
  onFinish,
  pending,
}: {
  /** 끝난 뒤. 센 횟수와 실제로 움직인 초를 넘긴다 */
  onFinish: (result: { reps: number; seconds: number; motion: string }) => void;
  pending?: boolean;
}) {
  const [motion, setMotion] = useState(MOTIONS[0]);
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [left, setLeft] = useState(ROUND_SEC);
  const [reps, setReps] = useState(0);

  const burst = useRef<TapBurstHandle>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(id);
          setPhase("done");
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const tap = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (phase !== "playing") return;
    setReps((v) => v + 1);
    const box = e.currentTarget.getBoundingClientRect();
    burst.current?.fire((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
  };

  if (phase === "done") {
    /*
      한 판은 60초다 — 초를 60번 세야 여기에 닿는다.
      시계로 다시 재면 탭을 뒤로 보낸 동안까지 얹히니 그러지 않는다.
    */
    const seconds = ROUND_SEC;
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <KidCharacter motion="cheer" size={150} animate />
        <p className="board-num mt-3 text-[3.4rem] leading-none">{reps}</p>
        <p className="text-ink-soft mt-1 text-base font-bold">
          {motion.label} {reps}번 했어요
        </p>

        <Button
          size="kid"
          className="mt-6"
          loading={pending}
          onClick={() => onFinish({ reps, seconds, motion: motion.label })}
        >
          기록하기
        </Button>
        <Button
          size="md"
          variant="ghost"
          className="mt-2"
          onClick={() => {
            setReps(0);
            setLeft(ROUND_SEC);
            setPhase("ready");
          }}
        >
          한 번 더
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[32rem] flex-col gap-4">
      {phase === "ready" && (
        <>
          <div className="flex gap-2">
            {MOTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMotion(m)}
                aria-pressed={motion.key === m.key}
                className={cn("chip press", motion.key === m.key && "chip-on")}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="border-line rounded-3xl border-2 border-dashed py-6 text-center">
            <KidCharacter motion={motion.key} size={150} className="mx-auto" />
            <p className="mt-2 text-lg font-extrabold">{motion.hint}</p>
            <p className="text-ink-soft mt-1 text-sm">1분 동안 할 때마다 화면을 눌러요</p>
          </div>
          <Button size="kid" onClick={() => setPhase("playing")}>
            시작!
          </Button>
        </>
      )}

      {phase === "playing" && (
        <>
          {/*
            세는 수가 주인공이다. 아이가 1분 내내 쳐다보는 건 남은 시간이 아니라
            방금 누른 것이 올라갔는지다 — 수를 크게, 시계는 옆에 작게.
          */}
          <div className="flex items-baseline justify-between">
            <span className="board-num text-[3.6rem] leading-none">{reps}</span>
            <span className="text-faint text-base font-extrabold tabular-nums">
              {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
            </span>
          </div>

          {/* 누르는 곳이 화면 전체다. 아이는 작은 버튼을 잘 못 누른다 */}
          <button
            type="button"
            onClick={tap}
            aria-label={`${motion.label} 한 번 셌어요`}
            /* 남은 자리를 다 쓴다. 아이 손가락이 어디에 닿아도 세져야 한다 */
            className="press bg-signal-soft relative block min-h-[24rem] w-full flex-1 overflow-hidden rounded-3xl"
          >
            <TapBurst
              ref={burst}
              assets={BURST_ASSETS}
              className="pointer-events-none absolute inset-0"
            />
            <span className="pointer-events-none absolute inset-0 grid place-content-center">
              <KidCharacter motion={motion.key} size={170} animate />
              <span className="text-signal-deep mt-1 text-lg font-extrabold">눌러요!</span>
            </span>
          </button>
        </>
      )}
    </div>
  );
}
