"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Badge } from "@/components/ui/badge";
import { LinkRow } from "@/components/domain/link-row";
import { useCoachRun } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useCoachRunId } from "@/stores/coach-store";

/**
 * 코치 허브.
 *
 * 승인 대기 중인 제안이 있으면 그것부터 말한다 — 여기서 막혀 있으면
 * 미션이 0건이라 앱 전체가 멈춘 것처럼 보인다.
 */
export default function CoachHubPage() {
  const { familyId } = useSession();
  const runId = useCoachRunId(familyId);
  const { data: run } = useCoachRun(runId);

  const waiting = run?.status === "AWAITING_APPROVAL";
  const running = run?.status === "RUNNING";

  return (
    <>
      <PageHeader eyebrow="COACH" title="운동 코치" />
      <Screen className="space-y-4">
        <p className="text-ink-soft text-sm leading-relaxed">
          가족의 측정 기록을 보고 국민체력100 운동처방과 영상에서 찾아 한 주를 짜요.
        </p>

        <ul className="divide-rows">
          <LinkRow
            href="/coach/weekly"
            art="item/item-clipboard"
            title="이번 주 제안"
            description="보호자가 승인하면 미션이 돼요"
            trailing={
              waiting ? (
                <Badge tone="signal">승인 기다림</Badge>
              ) : running ? (
                <Badge tone="neutral">만드는 중</Badge>
              ) : undefined
            }
          />
          <LinkRow
            href="/coach/chat"
            art="char/face-cheer"
            title="코치에게 묻기"
            description="답에는 어디서 찾았는지가 같이 붙어요"
          />
        </ul>
      </Screen>
    </>
  );
}
