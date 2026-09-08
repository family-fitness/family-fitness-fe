import { cn } from "@/lib/utils";

/** 로딩. 스피너 대신 실제 레이아웃 모양을 그린다 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function TrackSkeleton() {
  return (
    <div className="space-y-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-11 rounded-[10px]" />
      ))}
    </div>
  );
}

export function MemberCardSkeleton() {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
