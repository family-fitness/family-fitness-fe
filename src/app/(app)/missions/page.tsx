"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MissionRow } from "@/components/domain/mission-row";
import { useMissions } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 미션 목록.
 *
 * **여기 있는 것은 전부 승인을 거친 것이다.** 코치 제안은 이 화면에 오지 않는다.
 * 미션이 0건이면 그건 버그가 아니라 아직 승인하지 않았다는 뜻이다.
 *
 * 탭은 URL 로 표현한다. 뒤로 가기가 탭 전환을 되돌려야 앱처럼 느껴진다.
 */
const SCOPES = [
  ["ALL", "전체"],
  ["MINE", "내 것"],
  ["FAMILY", "함께"],
] as const;

const STATUSES = [
  ["ACTIVE", "하는 중"],
  ["DONE", "끝냄"],
  ["EXPIRED", "지남"],
] as const;

type Scope = (typeof SCOPES)[number][0];
type Status = (typeof STATUSES)[number][0];

export default function MissionsPage() {
  return (
    <Suspense fallback={<MissionsSkeleton />}>
      <MissionsContent />
    </Suspense>
  );
}

function MissionsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { familyId, isChild, isPending: sessionPending } = useSession();

  const scope = (params.get("scope") as Scope) ?? "ALL";
  const status = (params.get("status") as Status) ?? "ACTIVE";

  const { data, isPending } = useMissions(familyId, { scope, status });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`/missions?${next}`, { scroll: false });
  };

  if (sessionPending || isPending) return <MissionsSkeleton />;

  const missions = data?.missions ?? [];

  return (
    <>
      <PageHeader eyebrow="MISSION" title="가족 미션" meta={<span>{missions.length}개</span>} />

      <Screen className="space-y-5">
        <div className="space-y-2">
          <div className="flex gap-2" role="tablist" aria-label="범위">
            {SCOPES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={scope === value}
                onClick={() => setParam("scope", value)}
                className={cn("chip press", scope === value && "chip-on")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2" role="tablist" aria-label="상태">
            {STATUSES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={status === value}
                onClick={() => setParam("status", value)}
                className={cn("chip press", status === value && "chip-on")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {missions.length === 0 ? (
          <EmptyState
            scene="no-mission"
            title={emptyTitle(status)}
            description={emptyDescription(status, isChild)}
            action={
              status === "ACTIVE" ? (
                <Button size="md" onClick={() => router.push("/coach/weekly")}>
                  {isChild ? "이번 주 제안 보기" : "이번 주 제안 만들기"}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-rows">
            {missions.map((m) => (
              <MissionRow key={m.missionId} mission={m} />
            ))}
          </ul>
        )}
      </Screen>
    </>
  );
}

/** 0건은 버그가 아니다. 승인 전이라는 뜻이다 — 그걸 그대로 말한다 */
function emptyTitle(status: Status) {
  if (status === "DONE") return "아직 끝낸 미션이 없어요";
  if (status === "EXPIRED") return "지난 미션이 없어요";
  return "하는 중인 미션이 없어요";
}

function emptyDescription(status: Status, isChild: boolean) {
  if (status === "DONE") return "미션을 끝내면 여기에 쌓여요.";
  if (status === "EXPIRED") return "기간이 지난 미션이 여기 모여요.";
  return isChild
    ? "코치가 만든 이번 주 제안을 보호자가 승인하면 여기에 미션이 생겨요."
    : "코치가 이번 주 제안을 만들어요. 승인해야 미션이 됩니다.";
}

function MissionsSkeleton() {
  return (
    <>
      <PageHeader eyebrow="MISSION" title="가족 미션" />
      <Screen className="space-y-5">
        <Skeleton className="h-9 w-56 rounded-full" />
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 py-2">
            <div className="flex gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="ml-12 space-y-2">
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </Screen>
    </>
  );
}
