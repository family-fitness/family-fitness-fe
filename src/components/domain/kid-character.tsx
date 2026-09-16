import { Illustration } from "@/components/ui/illustration";
import { ANIM_FRAMES } from "@/lib/anim-frames";
import { cn } from "@/lib/utils";

/**
 * 아이 캐릭터.
 *
 * 프레임을 넘겨 가며 움직이던 것을 걷어냈다. 받은 연속 그림이 서로 이어지지 않고
 * 중간에 다른 인물이나 장식이 섞인 장이 있어서, 움직일수록 완성도가 떨어져 보였다.
 * 걸러 내고 속도를 맞춰도 끊긴 느낌이 남아, 지금은 **동작마다 가장 잘 읽히는 한 장**만 쓴다.
 *
 * `anim-frames.ts` 는 쓸 수 있는 프레임 번호표로 계속 쓴다 — 그 안에서 한 장을 고른다.
 * 프레임이 제대로 다시 오면 여기서 다시 이어 붙인다.
 */

/**
 * pick  그 동작이 가장 잘 읽히는 지점(0~1). 점프는 공중, 앉기는 가장 낮은 자세.
 *       1번 프레임은 대개 그냥 서 있는 모습이라 밋밋하다
 */
const POSE = {
  idle: { pick: 0, fallback: "move/move-walk" },
  jump: { pick: 0.55, fallback: "move/move-long-jump" },
  run: { pick: 0.5, fallback: "move/move-shuttle-run" },
  stretch: { pick: 0.34, fallback: "move/move-stretch-leg" },
  squat: { pick: 0.5, fallback: "move/move-squat" },
  cheer: { pick: 0.5, fallback: "scene/scene-done" },
  tired: { pick: 0.8, fallback: "move/move-walk" },
  wave: { pick: 0.34, fallback: "move/move-walk" },
} as const;

export type Motion = keyof typeof POSE;

export function KidCharacter({
  motion = "idle",
  size = 160,
  className,
}: {
  motion?: Motion;
  size?: number;
  className?: string;
}) {
  const { pick, fallback } = POSE[motion];

  // 격자나 장식이 섞여 잘못 뽑힌 장은 이 목록에 없다
  const frames = ANIM_FRAMES[motion] ?? [1];
  const frame = frames[Math.min(frames.length - 1, Math.round(pick * (frames.length - 1)))];

  return (
    <Illustration
      name={`anim/${motion}-${frame}`}
      fallback={fallback}
      size={size}
      className={cn("shrink-0", className)}
    />
  );
}
