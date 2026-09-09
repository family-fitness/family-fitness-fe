import { cn } from "@/lib/utils";

/** 로딩. 스피너 대신 실제 레이아웃 모양을 그린다 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function MemberRowSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-8 w-12" />
      </div>
      <Skeleton className="ml-15 h-2.5 rounded-full" />
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
