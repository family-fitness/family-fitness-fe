"use client";

import { ArtIcon } from "@/components/ui/art-icon";
import { Card, CardHead } from "@/components/ui/card";
import { useLatestCoachRun } from "@/lib/api/queries";

/**
 * 등록을 기다리는 제안이 있다.
 *
 * 제안은 등록해야 운동이 된다(규칙 1). 기다리는 제안을 홈에서 말하지 않으면 부모는
 * 아이 화면에 왜 아무것도 안 뜨는지 모른다. 등록 전이라는 말을 같이 둔다.
 */
export function ProposalNudge({ familyId }: { familyId: string | undefined }) {
  const { data: run } = useLatestCoachRun(familyId);
  if (run?.status !== "AWAITING_APPROVAL" || !run.coachRunId) return null;
  const title = (run.proposals ?? [])[0]?.title;

  return (
    <Card href={`/plan/${run.coachRunId}`} label="오늘 운동 제안 보기">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-signal-soft text-signal-strong grid size-11 shrink-0 place-items-center rounded-2xl"
        >
          <ArtIcon name="icon/menu-ai" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <CardHead title="AI 제안이 와 있어요" chevron />
          <p className="text-caption text-ink-soft">
            {title ? `${title} · ` : ""}등록하면 아이 화면에 떠요
          </p>
        </div>
      </div>
    </Card>
  );
}
