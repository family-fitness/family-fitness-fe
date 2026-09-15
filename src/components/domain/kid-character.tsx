"use client";

import { useEffect, useState } from "react";

import { Illustration } from "@/components/ui/illustration";
import { ANIM_FRAMES } from "@/lib/anim-frames";
import { cn } from "@/lib/utils";

/**
 * 움직이는 아이 캐릭터.
 *
 * 프레임이 **3장뿐**이라 그냥 갈아 끼우면 뚝뚝 끊긴다. 두 가지를 겹쳐서 잇는다.
 *
 *   1. 프레임을 겹쳐 두고 서서히 바꾼다(크로스페이드). 딱딱한 전환이 사라진다
 *   2. 몸 전체를 CSS 로 움직인다 — 이건 60fps 라 프레임 수와 상관없이 매끄럽다
 *
 * 뛰는 동작은 가운데 프레임이 공중이라, 그때 실제로 가장 높이 뜨도록 맞췄다.
 * 그림 3장이 아니라 하나의 몸짓으로 읽힌다.
 *
 * `prefers-reduced-motion` 이면 첫 프레임에서 멈춘다.
 */
/*
  프레임 수는 여기 적지 않는다. 에셋을 넣을 때 파이프라인이 세어 둔 값을 쓴다
  (`lib/anim-frames.ts`). 3장을 6장으로 늘려도 코드는 그대로다.
*/
const SEQUENCE = {
  idle: { move: "breathe", fallback: "move/move-walk" },
  jump: { move: "jump", fallback: "move/move-long-jump" },
  run: { move: "run", fallback: "move/move-shuttle-run" },
  stretch: { move: "breathe", fallback: "move/move-stretch-leg" },
  squat: { move: "squat", fallback: "move/move-squat" },
  cheer: { move: "cheer", fallback: "scene/scene-done" },
  tired: { move: "breathe", fallback: "move/move-walk" },
  wave: { move: "breathe", fallback: "move/move-walk" },
} as const;

export type Motion = keyof typeof SEQUENCE;

export function KidCharacter({
  motion = "idle",
  size = 160,
  /** 한 바퀴 도는 시간(ms). 길수록 차분하다 */
  cycle = 1100,
  className,
}: {
  motion?: Motion;
  size?: number;
  cycle?: number;
  className?: string;
}) {
  const { move, fallback } = SEQUENCE[motion];
  // 에셋이 아직 없으면 1장으로 본다 — 대체 그림 하나가 조용히 서 있는다
  const frames = ANIM_FRAMES[motion] ?? 1;
  const slot = cycle / frames;

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (frames < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % frames), slot);
    return () => clearInterval(id);
  }, [frames, slot, motion]);

  return (
    <span
      className={cn(`char-move-${move}`, "relative inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        ["--char-dur" as string]: `${cycle}ms`,
        // 겹쳐 넘기는 시간. 한 칸의 절반이면 끊긴 느낌이 사라진다
        ["--char-cross" as string]: `${Math.round(slot * 0.5)}ms`,
      }}
    >
      {Array.from({ length: frames }, (_, i) => (
        <Illustration
          key={i}
          name={`anim/${motion}-${i + 1}`}
          fallback={fallback}
          size={size}
          className="char-frame absolute inset-0"
          // 지금 프레임만 보이고 나머지는 숨는다. 넘어가는 건 CSS 가 이어 준다
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </span>
  );
}
