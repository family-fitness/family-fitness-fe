import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Skeleton } from "@/components/ui/skeleton";

/** 화면이 넘어가는 동안. */
export function RouteLoading({ kid = false }: { kid?: boolean }) {
  return (
    <>
      <AppBar title="" />
      <Stage wide={kid} className="space-y-6 pt-2">
        {kid ? (
          <>
            <div className="flex items-center gap-3">
              <Skeleton className="size-21 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
            <div className="flex justify-center">
              <Skeleton className="size-52 rounded-full" />
            </div>
            <Skeleton className="h-44 w-full rounded-3xl" />
          </>
        ) : (
          <>
            <div className="flex justify-center pt-2">
              <Skeleton className="size-49 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </>
        )}
      </Stage>
    </>
  );
}
