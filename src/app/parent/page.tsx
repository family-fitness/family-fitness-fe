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
import { ArtIcon } from "@/components/ui/art-icon";
import { ChildPanel } from "@/components/domain/child-panel";
import { ChildPill } from "@/components/domain/child-pill";
import { StreakChip } from "@/components/domain/streak-chip";
import { ClipShelf } from "@/components/domain/clip-shelf";
import { NotificationBell } from "@/components/domain/notification-bell";
import { PanelCell, PanelCells, WeekPanel, weekTotals } from "@/components/domain/week-panel";
import {
  useCalendar,
  useFitnessMap,
  useLatestFitnessTest,
  useMissions,
  useProgress,
} from "@/lib/api/queries";
import { isFactor } from "@/lib/fitness-factors";
import { useSession } from "@/lib/session";
import { longDate, weekOf } from "@/lib/today";
import { useRoleStore } from "@/stores/role-store";

/**
 * 부모 홈 — 큰 묶음 둘(9/25 사용자가 고름).
 *
 *   「우리 아이」  육각형 · 그 아래 통합 신체 점수 · 오늘 운동(칭찬 · 걸음수 확인 · 기다리는 제안)
 *   「이번 주」    오늘 링 셋 · 요일 탑 · 캘린더 · 운동 찾기 · 가족
 *   그 아래       아이의 키울 힘 영상이 가로로 한 줄(삼성헬스 홈처럼)
 *
 * 기능 하나마다 네모 카드 하나씩 쌓지 않는다 — 「ai 특유의 카드 형식」(9/25).
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
  // 영상 줄은 아이의 키울 힘으로 — 서버가 준 가장 낮은 요인
  const { data: latest } = useLatestFitnessTest(child?.profileId);
  const weakest = latest?.weakest?.factor;

  // 며칠 이어서 했는가 — 서버가 센 연속. 끊긴 날은 세지 않고, 끊겼다고 말하지 않는다
  const { data: progress } = useProgress(child?.profileId);

  const header = (
    <HomeHeader
      eyebrow={longDate()}
      title={map?.familyName ?? "우리집"}
      actions={
        <>
          {/* 보고 있는 아이 — 오른쪽 위 이름 알약(닥터아이처럼). 여럿이면 여기서 바로 바꾼다 */}
          <ChildPill kids={children} selectedId={child?.profileId} onSelect={setChild} />
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
        <ChildPanel
          child={child}
          familyId={familyId ?? ""}
          parentProfileId={profile?.profileId ?? ""}
          missions={missions?.missions}
        />

        <WeekPanel
          profileId={child.profileId}
          missions={missions?.missions}
          days={week.days}
          logs={calendar?.days}
          loading={calendarPending}
          meta={
            progress && progress.streakDays > 1 ? (
              <StreakChip days={progress.streakDays} />
            ) : calendarPending ? undefined : (
              weekMeta(week.days, calendar?.days)
            )
          }
        >
          <PanelCells>
            <PanelCell
              href={`/calendar?profileId=${encodeURIComponent(child.profileId ?? "")}`}
              label="캘린더"
              art={<ArtIcon name="icon/menu-calendar" className="size-9" />}
            />
            <PanelCell
              href="/videos"
              label="운동 찾기"
              art={<ArtIcon name="icon/menu-video" className="size-9" />}
            />
            <PanelCell
              href="/parent/family"
              label="가족"
              note={`${members.length}명`}
              art={<ArtIcon name="icon/menu-family" className="size-9" />}
            />
          </PanelCells>
        </WeekPanel>

        <ClipShelf factor={isFactor(weakest) ? weakest : null} />
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

/** 「이번 주」 머리 곁말 — 합친 분 · 운동한 날 */
function weekMeta(days: string[], logs: Parameters<typeof weekTotals>[1]) {
  const t = weekTotals(days, logs);
  return `${t.minutes}분 · ${t.active}일 운동`;
}
