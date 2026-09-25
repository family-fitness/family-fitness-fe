import { ArtIcon } from "@/components/ui/art-icon";
import { stickerOf } from "@/lib/stickers";

/**
 * 스티커 그림 한 장(`sticker/*`, `ASSET_PROMPTS.md` 2장). 오기 전에는 자리만 비어 있고
 * 스티커 이름(「최고야」)이 곁에서 뜻을 말한다. 다른 그림으로 대신 세우지 않는다.
 */
export function StickerArt({
  id,
  className,
}: {
  id: string | null | undefined;
  className?: string;
}) {
  return <ArtIcon name={stickerOf(id)?.art ?? "sticker/sticker-star"} className={className} />;
}
