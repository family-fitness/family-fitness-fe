import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/utils";

/**
 * 아이 캐릭터.
 *
 * 동작마다 **그림 한 장**이다. 프레임을 넘겨 가며 움직이던 것을 걷어냈다 —
 * 받은 연속 그림이 서로 이어지지 않고 중간에 다른 인물이나 장식이 섞인 장이 있어서,
 * 움직일수록 완성도가 떨어져 보였다.
 *
 * 쓰는 장은 눈으로 하나씩 확인해서 골랐다. 그래서 번호 대신 뜻이 담긴 이름을 쓴다 —
 * `anim/pose-jump.png` 는 공중에 뜬 장면이지 점프 동작의 5번째 칸이 아니다.
 */
/* 경로를 통째로 적는다. 합쳐 만들면 에셋 검사기가 쓰는 줄 모른다 */
const POSE = {
  idle: { file: "anim/pose-idle", fallback: "move/move-walk" },
  jump: { file: "anim/pose-jump", fallback: "move/move-long-jump" },
  run: { file: "anim/pose-run", fallback: "move/move-shuttle-run" },
  stretch: { file: "anim/pose-stretch", fallback: "move/move-stretch-leg" },
  squat: { file: "anim/pose-squat", fallback: "move/move-squat" },
  cheer: { file: "anim/pose-cheer", fallback: "scene/scene-done" },
  rest: { file: "anim/pose-rest", fallback: "move/move-walk" },
  wave: { file: "anim/pose-wave", fallback: "move/move-walk" },
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
  const { file, fallback } = POSE[motion];
  return (
    <Illustration
      name={file}
      fallback={fallback}
      size={size}
      className={cn("shrink-0", className)}
    />
  );
}
