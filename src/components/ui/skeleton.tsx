import { cn } from "@/lib/utils";

/**
 * 로딩 상태.
 * 스피너 하나로 때우지 않고 실제 레이아웃 모양을 그린다 (AGENTS.md).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-line animate-pulse rounded-lg", className)} />;
}

/** 구성원 카드가 뜰 자리 */
export function MemberCardSkeleton() {
  return (
    <div className="rounded-card bg-surface space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

/** 영상 카드가 뜰 자리 */
export function VideoCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
