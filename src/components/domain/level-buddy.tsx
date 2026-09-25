import { ASSETS } from "@/lib/asset-list";
import type { Stage } from "@/lib/levels";
import { cn } from "@/lib/utils";

/*
  레벨 캐릭터 「키움이」 — 주문한 그림(`level/level-1` … `level/level-5-cheer`, ASSET_PROMPTS.md 1장).
  머리 위 새싹이 단계마다 자란다. 몸은 그대로라 같은 아이가 자라는 것으로 읽힌다.

  그림이 없으면 자리만 비워 둔다 — 다른 그림으로 대신 세우지 않는다(AGENTS.md 「그림」).
  기본은 멈춤이다(AGENTS.md 「움직임」). `cheer` 는 두 팔을 번쩍 든 그림이다.
*/
export function LevelBuddy({
  stage,
  size = 144,
  cheer,
  className,
  label,
}: {
  stage: Stage;
  size?: number;
  /** 두 팔을 번쩍 든 그림 */
  cheer?: boolean;
  className?: string;
  /** 읽어 줄 이름. 없으면 그림으로만 둔다 */
  label?: string;
}) {
  const art = `level/level-${stage}${cheer ? "-cheer" : ""}`;
  if (!ASSETS.has(art)) {
    return (
      <span
        aria-hidden
        className={cn("block shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 크기가 고정된 작은 그림이다
    <img
      src={`/assets/${art}.png`}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
