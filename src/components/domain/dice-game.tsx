"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { KidCharacter, type Motion } from "@/components/domain/kid-character";
import { cn } from "@/lib/utils";

/** 주사위 운동. */
const MOVES: { motion: Motion; label: string }[] = [
  { motion: "jump", label: "점프" },
  { motion: "squat", label: "앉았다 일어서기" },
  { motion: "stretch", label: "쭉 펴기" },
  { motion: "run", label: "제자리 달리기" },
];

const ROUNDS = 3;

interface Roll {
  move: (typeof MOVES)[number];
  count: number;
}

/** 4~9회. 너무 적으면 시시하고 너무 많으면 중간에 그만둔다 */
function roll(): Roll {
  return {
    move: MOVES[Math.floor(Math.random() * MOVES.length)],
    count: 4 + Math.floor(Math.random() * 6),
  };
}

export function DiceGame({
  onFinish,
  pending,
}: {
  /** 끝난 뒤. 실제로 움직인 초를 넘긴다 */
  onFinish: (result: { seconds: number }) => void;
  pending?: boolean;
}) {
  const [phase, setPhase] = useState<"ready" | "rolling" | "done">("ready");
  const [current, setCurrent] = useState<Roll | null>(null);
  const [round, setRound] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const start = () => {
    setStartedAt(Date.now());
    setRound(1);
    setCurrent(roll());
    setPhase("rolling");
  };

  const next = () => {
    if (round >= ROUNDS) {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
      setPhase("done");
      return;
    }
    setRound((r) => r + 1);
    setCurrent(roll());
  };

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <Illustration name="item/item-dice" fallback="item/item-target" size={110} />
        <p className="mt-3 text-xl font-extrabold">주사위를 굴려 볼까?</p>
        <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">
          나온 운동을 나온 수만큼 해요. 세 번 굴리면 끝!
        </p>
        <Button size="kid" className="mt-6" onClick={start}>
          굴리기
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <KidCharacter motion="cheer" size={150} animate />
        <p className="mt-3 text-2xl font-extrabold">세 번 다 했어요!</p>
        <p className="text-faint mt-2 text-xs leading-relaxed">
          횟수는 직접 센 거예요. 움직인 시간은 앱이 기록해요.
        </p>
        <Button
          size="kid"
          className="mt-6"
          loading={pending}
          onClick={() => onFinish({ seconds: Math.max(elapsed, 60) })}
        >
          기록하기
        </Button>
        <Button size="md" variant="ghost" className="mt-2" onClick={start}>
          한 번 더
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-ink-soft text-sm font-extrabold">
          {round} / {ROUNDS}번째
        </span>
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span
              key={i}
              className={cn("size-2.5 rounded-full", i < round ? "bg-signal" : "bg-line")}
            />
          ))}
        </span>
      </div>

      <div className="bg-signal-soft rounded-3xl py-6 text-center">
        <KidCharacter
          motion={current?.move.motion ?? "idle"}
          size={170}
          className="mx-auto"
          animate
        />
        <p className="text-signal-deep mt-2 text-2xl font-extrabold">{current?.move.label}</p>
        <p className="board-num text-signal-deep mt-1 text-[3.2rem] leading-none">
          {current?.count}
          <span className="ml-1 text-xl font-extrabold">번</span>
        </p>
      </div>

      <Button size="kid" onClick={next}>
        {round >= ROUNDS ? "다 했어요!" : "했어요! 다음"}
      </Button>
    </div>
  );
}
