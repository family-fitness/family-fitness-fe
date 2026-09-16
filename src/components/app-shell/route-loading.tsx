import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 화면이 넘어가는 동안.
 *
 * 화면 전환을 넣으면서 이게 꼭 필요해졌다. 다음 화면의 코드가 아직 안 받아졌으면
 * **앞 화면이 그대로 멈춰 있다** — 눌렀는데 아무 일도 안 일어난 것처럼 보인다.
 *
 * 스피너 하나로 때우지 않는다. 그 화면이 어떻게 생겼는지 미리 보여주면
 * 기다리는 느낌이 짧아지고, 실제 내용이 들어올 때 덜컥거리지 않는다.
 *
 * 여기는 **뼈대만** 그린다. 화면마다 다른 스켈레톤은 각 화면이 데이터를
 * 기다리는 동안 따로 그린다.
 */
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
