import { cn } from "@/lib/utils";

/** 로딩. 스피너 대신 실제 레이아웃 모양을 그린다 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function MemberCardSkeleton() {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-2.5 w-full rounded-full" />
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
