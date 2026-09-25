import { Stage } from "@/components/app-shell/stage";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 화면이 넘어가는 동안 — 이 앱의 화면은 거의 다 「머리 한 줄 · 큰 묶음 하나 · 작은 묶음」 이다. 그 모양으로 선다.
 * 옛 모양(동그란 얼굴 · 큰 원)은 어느 화면과도 닮지 않아, 넘어가는 동안 모양이 두 번 바뀌었다.
 * 머리는 막대(뒤로 · 제목)와 홈의 날짜 · 이름 줄이 같은 높이(3.5rem)라 빈 자리로 둔다.
 */
export function RouteLoading({ kid = false }: { kid?: boolean }) {
  return (
    <>
      <div className="h-14" aria-hidden />
      <Stage wide className="space-y-3">
        <Skeleton className={kid ? "h-80 w-full rounded-3xl" : "h-96 w-full rounded-3xl"} />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
