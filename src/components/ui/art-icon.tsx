import { artFor } from "@/lib/art";
import { cn } from "@/lib/utils";

/**
 * 그림 자리. 주문한 그림(`ASSET_PROMPTS.md`)이 있으면 그 그림, 아직이면 **빈 자리**다.
 *
 * 선 아이콘으로 대신 세우지 않는다 — 내용 자리에 선 아이콘이 서면 이모트처럼 보인다
 * (9/23 요청 "이모트 쓴 거 다 그림으로"). 자리 크기는 그대로 두어 그림이 들어와도
 * 줄이 밀리지 않는다. 뒤로 · 닫기 · 재생 같은 조작 기호는 이 부품을 쓰지 않는다.
 */
export function ArtIcon({
  name,
  className,
}: {
  /** `icon/factor-cardio` 처럼 분류/이름 */
  name: string;
  /** 크기. 그림이 오든 안 오든 같은 상자를 차지한다 */
  className?: string;
}) {
  const art = artFor(name);
  if (!art) return <span aria-hidden className={cn("inline-block shrink-0", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 그림이라 최적화 이득보다 한 번 더 도는 요청이 크다
    <img
      src={`/assets/${art}.png`}
      alt=""
      aria-hidden
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
