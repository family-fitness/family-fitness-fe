"use client";

import { Card, CardHead } from "@/components/ui/card";
import { KiumIsland } from "@/components/scene/kium-island";
import { useProgress } from "@/lib/api/queries";
import { stageOf } from "@/lib/levels";

/**
 * 아이의 섬 — 부모도 아이가 보는 섬을 본다.
 *
 * 운동한 날마다 나무가 하나씩 자란다. 줄지 않는다 — 쉰 날을 세는 판이 아니라
 * 해낸 날이 쌓이는 곳이다. 부모 화면이라고 다르게 그리지 않는다.
 */
export function IslandCard({ profileId, name }: { profileId: string; name: string }) {
  const { data: progress } = useProgress(profileId);
  const stage = stageOf(progress?.level);
  const trees = progress?.activeDays ?? 0;

  return (
    <Card>
      <CardHead
        title={`${name}의 섬`}
        meta={progress ? `Lv.${progress.level} · 나무 ${trees}그루` : undefined}
      />
      <KiumIsland
        stage={stage.stage}
        level={progress?.level}
        plants={progress ? trees : null}
        seed={profileId}
        height={220}
        label={`${name}의 섬. 운동한 날마다 나무가 하나씩 자라요. 지금 ${trees}그루`}
        className="-mt-3"
      />
    </Card>
  );
}
