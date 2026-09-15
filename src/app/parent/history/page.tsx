"use client";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MissionRow } from "@/components/domain/mission-row";
import { useMissions } from "@/lib/api/queries";
import { useSession } from "@/lib/session";

/**
 * 지난 기록.
 *
 * 부모 홈의 「오늘」은 오늘만 본다. 지난 한 주에 뭘 했는지는 여기서 본다.
 *
 * **못 한 것을 세지 않는다.** 끝낸 것만 모아 보여준다 — 지난 기록을 여는 이유는
 * 잘한 걸 다시 보려는 것이지 빠뜨린 걸 확인하려는 게 아니다.
 */
export default function HistoryPage() {
  const { familyId, isPending } = useSession();
  const { data: done, isPending: donePending } = useMissions(familyId, {
    scope: "ALL",
    status: "DONE",
  });

  if (isPending || donePending) {
    return (
      <>
        <AppBar back title="지난 기록" />
        <Stage className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </Stage>
      </>
    );
  }

  const missions = done?.missions ?? [];

  return (
    <>
      <AppBar back title="지난 기록" />
      <Stage>
        {missions.length === 0 ? (
          <EmptyState
            scene="no-mission"
            title="아직 끝낸 운동이 없어요"
            description="하나를 끝내면 여기에 쌓여요."
          />
        ) : (
          <ul className="divide-rows">
            {missions.map((m) => (
              <MissionRow key={m.missionId} mission={m} />
            ))}
          </ul>
        )}
      </Stage>
    </>
  );
}
