"use client";

import { useEffect, useState } from "react";

import { Illustration } from "@/components/ui/illustration";
import { ANIM_FRAMES } from "@/lib/anim-frames";
import { cn } from "@/lib/utils";

/**
 * 아이 캐릭터. **기본은 멈춤** — 한 화면에 움직이는 것이 둘 이상이면 산만하다.
 * 쓸 수 있는 프레임 번호는 `lib/anim-frames.ts` 에서 온다(에셋을 넣으면 자동 갱신).
 */

/**
 * still  멈췄을 때 보여줄 지점(0~1). 그 동작이 가장 잘 읽히는 프레임
 * cycle  한 바퀴 도는 시간(ms). 동작마다 실제 속도가 다르다 —
 *        숨쉬기는 느리고 달리기는 빠르다. 하나로 맞추면 전부 어색해진다
 */
const SEQUENCE = {
  idle: { move: "breathe", still: 0, cycle: 3200, fallback: "move/move-walk" },
  jump: { move: "jump", still: 0.55, cycle: 1600, fallback: "move/move-long-jump" },
  run: { move: "run", still: 0, cycle: 900, fallback: "move/move-shuttle-run" },
  stretch: { move: "breathe", still: 0.34, cycle: 2800, fallback: "move/move-stretch-leg" },
  squat: { move: "squat", still: 0.5, cycle: 2200, fallback: "move/move-squat" },
  cheer: { move: "cheer", still: 0.5, cycle: 1500, fallback: "scene/scene-done" },
  tired: { move: "breathe", still: 0.8, cycle: 3000, fallback: "move/move-walk" },
  wave: { move: "breathe", still: 0.34, cycle: 1400, fallback: "move/move-walk" },
} as const;

export type Motion = keyof typeof SEQUENCE;

export function KidCharacter({
  motion = "idle",
  size = 160,
  cycle,
  /** 움직일지. 기본은 멈춤 — 한 화면에 하나만 켠다 */
  animate = false,
  className,
}: {
  motion?: Motion;
  size?: number;
  cycle?: number;
  animate?: boolean;
  className?: string;
}) {
  const seq = SEQUENCE[motion];
  const { move, still, fallback } = seq;

  // 격자로 잘못 뽑힌 장은 목록에 없다. 남은 것만 돌린다
  const frames = ANIM_FRAMES[motion] ?? [1];
  const duration = cycle ?? seq.cycle;
  const slot = duration / frames.length;

  const stillFrame = frames[Math.min(frames.length - 1, Math.round(still * (frames.length - 1)))];

  // 돌아간 횟수만 센다. 보여줄 프레임은 렌더에서 계산한다
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animate || frames.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), slot);
    return () => clearInterval(id);
  }, [animate, frames.length, slot, motion]);

  /*
    멈춰 있으면 한 장만 받는다. 프레임을 전부 그려 두면 캐릭터 하나에 이미지 여덟 장이다 —
    카드가 다섯이면 마흔 장을 받는다.
  */
  if (!animate || frames.length < 2) {
    return (
      <span
        className={cn("relative inline-block shrink-0", className)}
        style={{ width: size, height: size }}
      >
        <Illustration
          name={`anim/${motion}-${stillFrame}`}
          fallback={fallback}
          size={size}
          className="absolute inset-0"
        />
      </span>
    );
  }

  const shown = tick % frames.length;

  return (
    <span
      className={cn(`char-move-${move}`, "relative inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        ["--char-dur" as string]: `${duration}ms`,
        // 겹쳐 넘기는 시간. 한 칸의 절반이면 끊긴 느낌이 사라진다
        ["--char-cross" as string]: `${Math.round(slot * 0.5)}ms`,
      }}
    >
      {frames.map((frame, i) => (
        <Illustration
          key={frame}
          name={`anim/${motion}-${frame}`}
          fallback={fallback}
          size={size}
          className="char-frame absolute inset-0"
          style={{ opacity: i === shown ? 1 : 0 }}
        />
      ))}
    </span>
  );
}
