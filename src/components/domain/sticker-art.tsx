import {
  Crown,
  Flag,
  Hand,
  Heart,
  Medal,
  Rocket,
  Sparkles,
  Sprout,
  Star,
  Sun,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";

import { ArtIcon } from "@/components/ui/art-icon";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { artFor } from "@/lib/interim-art";
import { stickerOf } from "@/lib/stickers";
import { cn } from "@/lib/utils";

/** 그림이 오기 전까지 스티커마다 다른 모양으로 선다 — 다 별이면 「최고야」 가 여러 장이 된다 */
const FALLBACK: Record<string, LucideIcon> = {
  star: Star,
  thumb: ThumbsUp,
  medal: Medal,
  heart: Heart,
  crown: Crown,
  flag: Flag,
  sprout: Sprout,
  sparkle: Sparkles,
  clap: Hand,
  rocket: Rocket,
  sun: Sun,
};

/**
 * 스티커 그림 한 장. 주문한 그림(`sticker/*`) → 옛 도장 → 선 아이콘 순으로 선다.
 * 「꼭 안아 줄게」 는 키움이 얼굴이라, 그림이 오기 전에는 코드로 그린 키움이가 선다.
 */
export function StickerArt({
  id,
  className,
}: {
  id: string | null | undefined;
  className?: string;
}) {
  const sticker = stickerOf(id);
  if (sticker?.id === "kiumi" && !artFor(sticker.art)) {
    return <LevelBuddy stage={1} size={48} className={cn("shrink-0", className)} />;
  }
  return (
    <ArtIcon
      name={sticker?.art ?? "sticker/sticker-star"}
      fallback={(sticker && FALLBACK[sticker.id]) ?? Star}
      className={cn("text-mark", className)}
    />
  );
}
