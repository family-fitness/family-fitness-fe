"use client";

import { useEffect, useState } from "react";

import { Illustration } from "@/components/ui/illustration";
import { ANIM_FRAMES } from "@/lib/anim-frames";
import { cn } from "@/lib/utils";

/**
 * 아이 캐릭터.
 *
 * **기본은 멈춰 있다.** 화면에 움직이는 캐릭터가 둘만 돼도 눈이 어디를 봐야 할지
 * 모르게 되고, 다섯이면 그냥 산만하다. 움직임은 "여기를 보라" 는 신호라서
 * 한 화면에 하나여야 뜻이 있다.
 *
 * `animate` 를 켜는 곳은 셋뿐이다.
 *   - 지금 눌러야 할 것 (오늘 할 운동 카드)
 *   - 지금 따라 해야 할 동작 (놀이 중)
 *   - 방금 해낸 순간 (다 했어요 · 칭찬)
 *
 * 멈춰 있을 때는 **그 동작이 가장 잘 읽히는 프레임**을 보여준다. 점프는 공중,
 * 앉기는 가장 낮은 자세다. 1번 프레임은 대개 그냥 서 있는 모습이라 밋밋하다.
 *
 * 프레임 수는 코드에 적지 않는다. 에셋을 넣을 때 파이프라인이 세어 둔 값을 쓴다
 * (`lib/anim-frames.ts`) — 3장을 8장으로 늘려도 코드는 그대로다.
 */
const SEQUENCE = {
  //                                     still: 멈췄을 때 보여줄 지점(0~1)
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

  /*
    돌아간 횟수만 센다. 보여줄 프레임은 렌더에서 계산한다 —
    멈출 때 effect 안에서 상태를 되돌리면 렌더가 한 번 더 돈다.
  */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animate || frames < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), slot);
    return () => clearInterval(id);
  }, [animate, frames, slot, motion]);

  const index = animate && frames > 1 ? tick % frames : stillIndex;

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
          // 지금 프레임만 보이고 나머지는 숨는다. 넘어가는 건 CSS 가 이어 준다
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </span>
  );
}
