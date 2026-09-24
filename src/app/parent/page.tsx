"use client";

import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { HomeHeader } from "@/components/app-shell/home-header";
import { Stage } from "@/components/app-shell/stage";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { IconLink } from "@/components/ui/icon-link";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { BodyCard } from "@/components/domain/body-card";
import { ChildSwitch } from "@/components/domain/child-switch";
import { FamilyCard } from "@/components/domain/family-card";
import { FinderCard } from "@/components/domain/finder-card";
import { NotificationBell } from "@/components/domain/notification-bell";
import { ProposalNudge } from "@/components/domain/proposal-nudge";
import { TodayCard } from "@/components/domain/today-card";
import { UpdateNudge } from "@/components/domain/update-nudge";
import { WeekCard } from "@/components/domain/week-card";
import { useCalendar, useFitnessMap, useMissions } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { longDate, weekOf } from "@/lib/today";
import { useRoleStore } from "@/stores/role-store";

/**
 * 부모 홈.
 *
 * 위에서 아래로 읽으면 **아이가 어디쯤인지 → 오늘 무엇을 하는지 → 이번 주가 어땠는지**.
 * 주인공은 맨 위 체력 카드 하나다. 나머지 카드는 작고, 카드가 곧 다른 화면으로 가는 길이다.
 */
export default function ParentHomePage() {
  const router = useRouter();
  const { familyId, profile, isPending, error: sessionError } = useSession();
  const {
    data: map,
    isPending: mapPending,
    error: mapError,
    refetch: refetchMap,
    isRefetching,
  } = useFitnessMap(familyId);
  const { data: missions } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });

  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);

  const members = map?.members ?? [];
  const children = members.filter((m) => m.role === "CHILD");
  // 고른 적이 없으면 첫째로 본다. 기본값을 저장하지 않는다 — effect 에서 상태를 쓰면
  // 렌더가 한 번 더 돈다
  const child = children.find((c) => c.profileId === childProfileId) ?? children[0];

  const week = weekOf();
  const { data: calendar, isPending: calendarPending } = useCalendar(
    familyId,
    child?.profileId,
    week,
  );

  const header = (
    <HomeHeader
      eyebrow={longDate()}
      title={map?.familyName ?? "우리집"}
      actions={
        <>
          <NotificationBell profileId={profile?.profileId ?? undefined} />
          <IconLink href="/settings" label="설정">
            <Settings className="size-6" strokeWidth={1.8} />
          </IconLink>
        </>
      }
    />
  );

  /** 실패를 기다림보다 먼저 본다 */
  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar title="우리집" />
        <Stage>
          <ErrorState error={failure} onRetry={() => void refetchMap()} retrying={isRefetching} />
        </Stage>
      </>
    );
  }

  if (isPending || mapPending) return <ParentHomeSkeleton />;

  // 아이를 아직 등록하지 않았다. 이 앱은 아이가 없으면 할 일이 없다
  if (!child) {
    return (
      <>
        {header}
        <Stage className="flex flex-col items-center pt-10 text-center">
          <Illustration name="scene/kiumi-no-record" size={150} />
          <h2 className="mt-4 text-xl font-extrabold">아이를 등록해 주세요</h2>
          <Button size="md" className="mt-5" onClick={() => router.push("/start/child")}>
            아이 등록하기
          </Button>
        </Stage>
      </>
    );
  }

  return (
    <>
      {header}
      <Stage wide className="space-y-3">
        <ChildSwitch kids={children} selectedId={child.profileId} onSelect={setChild} />

        <BodyCard child={child} />
        <UpdateNudge child={child} />

        <ProposalNudge familyId={familyId} />

        <TodayCard
          familyId={familyId ?? ""}
          parentProfileId={profile?.profileId ?? ""}
          childProfileId={child.profileId ?? ""}
          childName={child.name ?? "아이"}
          missions={missions?.missions}
          weekLogs={calendar?.days}
        />

        <WeekCard
          days={week.days}
          logs={calendar?.days}
          loading={calendarPending}
          href="/calendar"
        />
        <FinderCard />
        <FamilyCard members={members} />
      </Stage>
    </>
  );
}

function ParentHomeSkeleton() {
  return (
    <>
      <div className="px-5 pt-4 pb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-8 w-36" />
      </div>
      <Stage wide className="space-y-3">
        <Skeleton className="h-112 w-full rounded-3xl" />
        <Skeleton className="h-36 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
