"use client";

import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { InviteSheet } from "@/components/domain/invite-sheet";
import { KidsOverview } from "@/components/domain/kids-overview";
import { ChildPill } from "@/components/domain/child-pill";
import { StreakChip } from "@/components/domain/streak-chip";
import { ClipShelf } from "@/components/domain/clip-shelf";
import { NotificationBell } from "@/components/domain/notification-bell";
import { PanelCell, PanelCells, WeekPanel, weekTotals } from "@/components/domain/week-panel";
import {
  useCalendar,
  useFamilyLeague,
  useFitnessMap,
  useLatestFitnessTest,
  useCurrentMissions,
  useFamilyProfiles,
  useProgress,
} from "@/lib/api/queries";
import { artFor } from "@/lib/art";
import { isFactor } from "@/lib/fitness-factors";
import { tierArt, tierName } from "@/lib/league";
import { useSession } from "@/lib/session";
import { longDate, monthOf, today, weekOf } from "@/lib/today";
import type { FamilyLeague } from "@/lib/api/types";
import { useRoleStore } from "@/stores/role-store";

/**
 * 부모 홈 — 맨 위에 우리 아이 모두, 그 아래 고른 아이 자세히(9/25).
 *
 *   「우리 아이」  아이마다 한 줄 — 오늘 · 이어서 · 이번 주 점 · 신체 점수. 누르면 그 아이를 고른다 · 아이 등록 · 초대
 *   고른 아이      육각형 · 그 아래 통합 신체 점수 · 오늘 운동(칭찬 · 걸음수 확인 · 기다리는 제안)
 *   「이번 주」    고른 아이의 오늘 링 셋 · 요일 탑 · 캘린더 · 가족 리그 · 우리 가족
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
  const { data: missions } = useCurrentMissions(familyId);

  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);
  // 초대하기 — 가족 대시보드와 같은 시트. 홈에서 바로 연다(9/25 「초대코드 생성하는 건 어디 갔어?」)
  const { data: family } = useFamilyProfiles(familyId);
  const [inviting, setInviting] = useState(false);

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
  const { data: league, error: leagueError } = useFamilyLeague(
    familyId ?? undefined,
    monthOf(today()),
  );

  const header = (
    <HomeHeader
      eyebrow={longDate()}
      title={map?.familyName ?? "우리집"}
      // 가족 이름을 누르면 가족 대시보드 — 가족 전체를 한 화면에서
      titleHref="/parent/dashboard"
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
        {/* 우리 아이 모두 한 번에 — 누르면 아래가 그 아이로(9/25) */}
        <KidsOverview
          kids={children}
          selectedId={child.profileId}
          onSelect={setChild}
          familyId={familyId ?? undefined}
          missions={missions?.missions}
          onInvite={() => setInviting(true)}
        />

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
            {/* 다른 가족들과 겨루는 자리. 운동 찾기는 아래 영상 줄 머리와 「직접 짜서 더하기」 에 있다.
                리그를 못 받으면(서버에 아직 없으면) 칸을 두지 않는다 — 누르면 오류 화면이다 */}
            {!leagueError && (
              <PanelCell
                href="/parent/league?from=home"
                label="가족 리그"
                note={leagueNote(league)}
                art={
                  // 메달 그림이 오기 전에는 빌린 그림 대신 티어 이름을 크게(주문한 그림만 부른다)
                  league ? (
                    artFor(tierArt(league.tier)) ? (
                      <ArtIcon name={tierArt(league.tier)} className="size-9" />
                    ) : (
                      <span className="text-signal-deep text-lead font-extrabold">
                        {tierName(league.tier)}
                      </span>
                    )
                  ) : null
                }
              />
            )}
            <PanelCell
              href="/parent/dashboard"
              label="우리 가족"
              note={`${members.length}명`}
              art={<ArtIcon name="icon/menu-family" className="size-9" />}
            />
          </PanelCells>
        </WeekPanel>

        <ClipShelf factor={isFactor(weakest) ? weakest : null} />
      </Stage>
      <InviteSheet
        open={inviting}
        onClose={() => setInviting(false)}
        familyName={map?.familyName ?? "우리 가족"}
        members={family?.profiles ?? []}
        loading={!family}
      />
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

/** 「가족 리그」 칸 곁말 — 메달 그림이 있으면 티어 · 등수, 없으면(이름이 그림 자리에 선다) 등수만. 셀 날이 없으면 비운다 */
function leagueNote(league: FamilyLeague | undefined) {
  if (!league || league.rank == null) return undefined;
  return artFor(tierArt(league.tier))
    ? `${tierName(league.tier)} · ${league.rank}등`
    : `${league.rank}등`;
}
