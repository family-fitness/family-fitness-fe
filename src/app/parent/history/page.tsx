"use client";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MissionRow } from "@/components/domain/mission-row";
import { useMissions } from "@/lib/api/queries";
import { useSession } from "@/lib/session";

/** 지난 기록. */
export default function HistoryPage() {
  const { familyId, isPending } = useSession();
  const { data: done, isPending: donePending } = useMissions(familyId, {
    scope: "ALL",
    status: "DONE",
  });

  if (isPending || donePending) {
    return (
      <>
        <AppBar backHref="/parent" title="지난 기록" />
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
      <AppBar backHref="/parent" title="지난 기록" />
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
