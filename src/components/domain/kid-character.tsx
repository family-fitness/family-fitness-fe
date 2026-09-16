"use client";

import { useEffect, useState } from "react";

import { Illustration } from "@/components/ui/illustration";
import { ANIM_FRAMES } from "@/lib/anim-frames";
import { cn } from "@/lib/utils";

/**
 * 아이 캐릭터. **기본은 멈춤** — 한 화면에 움직이는 것이 둘 이상이면 산만하다.
 * 프레임 수는 `lib/anim-frames.ts` 에서 온다(에셋을 넣으면 자동으로 갱신).
 */
/** still: 멈췄을 때 보여줄 지점(0~1). 그 동작이 가장 잘 읽히는 프레임 */
const SEQUENCE = {
  idle: { move: "breathe", still: 0, fallback: "move/move-walk" },
  jump: { move: "jump", still: 0.5, fallback: "move/move-long-jump" },
  run: { move: "run", still: 0, fallback: "move/move-shuttle-run" },
  stretch: { move: "breathe", still: 0.34, fallback: "move/move-stretch-leg" },
  squat: { move: "squat", still: 0.5, fallback: "move/move-squat" },
  cheer: { move: "cheer", still: 0.5, fallback: "scene/scene-done" },
  tired: { move: "breathe", still: 0.8, fallback: "move/move-walk" },
  wave: { move: "breathe", still: 0.34, fallback: "move/move-walk" },
} as const;

export type Motion = keyof typeof SEQUENCE;

export function KidCharacter({
  motion = "idle",
  size = 160,
  /** 한 바퀴 도는 시간(ms). 길수록 차분하다 */
  cycle = 1100,
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
  const { move, still, fallback } = SEQUENCE[motion];
  // 에셋이 아직 없으면 1장으로 본다 — 대체 그림 하나가 조용히 서 있는다
  const frames = ANIM_FRAMES[motion] ?? 1;
  const slot = cycle / frames;

  /** 멈춰 있을 때 보여줄 프레임 */
  const stillIndex = Math.min(frames - 1, Math.round(still * (frames - 1)));

  // 돌아간 횟수만 센다. 보여줄 프레임은 렌더에서 계산한다
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animate || frames < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), slot);
    return () => clearInterval(id);
  }, [animate, frames, slot, motion]);

  const index = animate && frames > 1 ? tick % frames : stillIndex;

  /*
    멈춰 있으면 한 장만 받는다.
    프레임을 전부 그려 두면 캐릭터 하나에 이미지 8장이다 — 운동 고르기처럼
    카드가 다섯이면 40장을 받는다. 폰에서는 그것만으로 첫 화면이 늦어진다.
  */
  if (!animate || frames < 2) {
    return (
      <span
        className={cn("relative inline-block shrink-0", className)}
        style={{ width: size, height: size }}
      >
        <Illustration
          name={`anim/${motion}-${stillIndex + 1}`}
          fallback={fallback}
          size={size}
          className="absolute inset-0"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(animate && `char-move-${move}`, "relative inline-block shrink-0", className)}
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
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </span>
  );
}
