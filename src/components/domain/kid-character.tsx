"use client";

import { useEffect, useState } from "react";

import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";

/**
 * 움직이는 아이 캐릭터.
 *
 * 프레임 3장을 번갈아 보여줘 애니메이션을 만든다. 스프라이트 시트를 쓰지 않는 이유는
 * 에셋을 한 장씩 받기 때문이다 — 시트로 묶으면 한 프레임만 고쳐도 다시 뽑아야 한다.
 *
 * **2차 에셋(`anim/`)이 오기 전에는 1차 정지 그림으로 버틴다.** 세 프레임이 모두
 * 같은 대체 그림으로 떨어져서 멈춰 있는 것처럼 보일 뿐, 화면이 비지 않는다.
 *
 * `prefers-reduced-motion` 이면 첫 프레임에서 멈춘다.
 */
/*
  대체 그림은 **전신 자세**여야 한다.
  1차 에셋의 `char/body-*` 는 아바타를 겹쳐 만들 때 쓰는 부품이라
  단독으로 쓰면 머리 없는 사람이 나온다.
*/
const SEQUENCE = {
  idle: { frames: ["anim/idle-1", "anim/idle-2", "anim/idle-3"], fallback: "move/move-walk" },
  jump: { frames: ["anim/jump-1", "anim/jump-2", "anim/jump-3"], fallback: "move/move-long-jump" },
  run: { frames: ["anim/run-1", "anim/run-2", "anim/run-3"], fallback: "move/move-shuttle-run" },
  stretch: {
    frames: ["anim/stretch-1", "anim/stretch-2", "anim/stretch-3"],
    fallback: "move/move-stretch-leg",
  },
  squat: { frames: ["anim/squat-1", "anim/squat-2", "anim/squat-3"], fallback: "move/move-squat" },
  cheer: { frames: ["anim/cheer-1", "anim/cheer-2", "anim/cheer-3"], fallback: "scene/scene-done" },
  tired: { frames: ["anim/tired-1", "anim/tired-2", "anim/tired-3"], fallback: "move/move-walk" },
  wave: { frames: ["anim/wave-1", "anim/wave-2", "anim/wave-3"], fallback: "move/move-walk" },
} as const;

export type Motion = keyof typeof SEQUENCE;

export function KidCharacter({
  motion = "idle",
  size = 160,
  /** 한 프레임을 보여줄 시간(ms). 느릴수록 차분하다 */
  speed = 380,
  className,
}: {
  motion?: Motion;
  size?: number;
  speed?: number;
  className?: string;
}) {
  const { frames, fallback } = SEQUENCE[motion];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % frames.length), speed);
    return () => clearInterval(id);
  }, [frames.length, speed, motion]);

  return (
    <Illustration
      // 프레임이 바뀔 때마다 새 이미지로 갈아 끼운다
      key={frames[index]}
      name={frames[index]}
      fallback={fallback}
      size={size}
      className={cn("shrink-0", className)}
    />
  );
}
