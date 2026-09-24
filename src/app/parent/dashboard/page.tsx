"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Initial } from "@/components/ui/initial";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteSheet } from "@/components/domain/invite-sheet";
import { StreakChip } from "@/components/domain/streak-chip";
import type { DayLog, FitnessMapMember, Mission } from "@/lib/api/types";
import {
  useFamilyCalendars,
  useFamilyProfiles,
  useFitnessMap,
  useMissions,
  useProgress,
} from "@/lib/api/queries";
import { daySummary } from "@/lib/day";
import { sessionsOf } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { monthGrid, monthLabel, monthOf, today, weekOf } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 가족 대시보드 — 부모가 가족 전체를 한 화면에서(9/25 「부모에겐 전체적인 가족 대시보드가 보이는 화면이 필요해」).
 *
 * 큰 묶음 둘이다.
 *   「이번 달 우리 가족」  운동한 날 · 움직인 시간 · 끝낸 운동 · 받은 칭찬 — 누가 하든 한 곳에 모인다
 *   「구성원」           사람마다 오늘 · 이번 주 · 며칠 이어서. 아직 안 들어온 자리는 초대
 *
 * 구성원끼리 점수를 나란히 세우지 않는다 — 가족 안에서 줄을 세우면 형제 비교가 된다(규칙 10).
 * 흐름 시연판(9/17)의 대시보드는 무엇을 보여 줄지만 참고했다. 모양은 이 앱의 결이다.
 */
export default function FamilyDashboardPage() {
  const { familyId, profile, isPending, error: sessionError } = useSession();
  const {
    data: map,
    isPending: mapPending,
    error: mapError,
    refetch,
    isRefetching,
  } = useFitnessMap(familyId);
  const { data: family } = useFamilyProfiles(familyId);
  const { data: missions } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });
  // 초대 시트 — 닫힘(undefined) · 누구든(null) · 이 자리로(id)
  const [inviting, setInviting] = useState<string | null | undefined>(undefined);

  const now = today();
  const month = monthOf(now);
  const grid = monthGrid(month);
  const members = map?.members ?? [];
  const calendars = useFamilyCalendars(
    familyId,
    members.map((m) => m.profileId ?? "").filter(Boolean),
    { from: grid.from, to: grid.to },
  );

  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar backHref="/parent" title="우리 가족" />
        <Stage wide>
          <ErrorState error={failure} onRetry={() => void refetch()} retrying={isRefetching} />
        </Stage>
      </>
    );
  }
  if (isPending || mapPending) return <DashboardSkeleton />;

  const logsOf = (profileId: string | undefined) =>
    calendars[members.findIndex((m) => m.profileId === profileId)]?.data?.days ?? [];
  const monthLogs = members.flatMap((m) =>
    logsOf(m.profileId).filter((d) => monthOf(d.date) === month),
  );
  const calendarState = calendars.some((q) => q.error)
    ? "error"
    : calendars.some((q) => q.isPending)
      ? "pending"
      : "ready";
  const activeDays = new Set(monthLogs.filter((d) => d.minutes > 0).map((d) => d.date)).size;
  const minutes = monthLogs.reduce((sum, d) => sum + d.minutes, 0);
  const done = monthLogs.reduce((sum, d) => sum + daySummary(d).done, 0);
  const stickers = monthLogs.reduce((sum, d) => sum + d.stickers.length, 0);
  const profiles = family?.profiles ?? [];

  return (
    <>
      <AppBar backHref="/parent" title={map?.familyName ?? "우리 가족"} />
      <Stage wide className="space-y-3">
        {/* 첫 묶음 — 이번 달 우리 가족. 누가 했는지 가르지 않고 한 곳에 모은다 */}
        <section className="card-hero" aria-label="이번 달 우리 가족">
          <CardHead title="이번 달 우리 가족" meta={monthLabel(month)} />
          <div className="mt-2 grid grid-cols-2">
            <FamilyStat
              label="가족이 운동한 날"
              value={activeDays}
              unit="일"
              state={calendarState}
            />
            <FamilyStat
              label="모두 움직인 시간"
              value={minutes}
              unit="분"
              state={calendarState}
              left
            />
            <FamilyStat
              label="끝낸 운동"
              value={done}
              unit="개"
              state={calendarState}
              top
              // 칭찬 칸이 없으면 아랫줄 하나가 폭을 다 쓴다 — 반쪽이 비어 보이지 않게
              wide={stickers === 0 && calendarState === "ready"}
            />
            {/* 칭찬은 받은 달에만 — 0장을 적어 두면 못 받은 달이 된다(규칙 12) */}
            {(stickers > 0 || calendarState !== "ready") && (
              <FamilyStat
                label="받은 칭찬"
                value={stickers}
                unit="장"
                state={calendarState}
                left
                top
              />
            )}
          </div>
          <NavLink
            href="/plan"
            className="press border-line mt-3 flex min-h-12 items-center gap-3 border-t pt-3"
          >
            <ArtIcon name="icon/menu-ai" className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">AI 코치에게 운동 받기</span>
              <span className="text-caption text-ink-soft block">
                국민체력100 또래 운동처방으로
              </span>
            </span>
            <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
          </NavLink>
        </section>

        {/* 둘째 묶음 — 구성원. 한 사람이 한 줄, 점수로 줄 세우지 않는다 */}
        <section className="card" aria-label="구성원">
          <CardHead title="구성원" meta={`${members.length}명`} />
          <ul className="divide-rows mt-1">
            {members.map((m) => (
              <MemberLine
                key={m.profileId}
                member={m}
                me={m.profileId === profile?.profileId}
                hasAccount={
                  profiles.find((p) => p.profileId === m.profileId)?.hasAccount ?? m.hasAccount
                }
                logs={logsOf(m.profileId)}
                missions={missions?.missions}
                onInvite={() => setInviting(m.profileId ?? null)}
              />
            ))}
          </ul>
          <div className="border-line mt-1 grid grid-cols-2 gap-2 border-t pt-3">
            <button
              type="button"
              onClick={() => setInviting(null)}
              className="press bg-signal-soft text-signal-deep flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
            >
              <ArtIcon name="icon/menu-invite" className="size-5" />
              초대하기
            </button>
            <Link
              href="/parent/family"
              className="press bg-sub flex min-h-11 items-center justify-center rounded-2xl text-sm font-extrabold"
            >
              가족 관리
            </Link>
          </div>
        </section>
      </Stage>

      <InviteSheet
        key={inviting ?? "any"}
        open={inviting !== undefined}
        onClose={() => setInviting(undefined)}
        familyName={map?.familyName ?? "우리 가족"}
        members={profiles}
        initialId={inviting}
      />
    </>
  );
}

/** 이번 달 숫자 한 칸. 못 받은 것은 「—」 — 0 을 그리면 안 한 달처럼 보인다 */
function FamilyStat({
  label,
  value,
  unit,
  state,
  left,
  top,
  wide,
}: {
  label: string;
  value: number;
  unit: string;
  state: "pending" | "error" | "ready";
  left?: boolean;
  top?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-1 py-3",
        left && "border-line border-l pl-4",
        top && "border-line border-t",
        wide && "col-span-2",
      )}
    >
      <p className="metric-label">{label}</p>
      {state === "pending" ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : state === "error" ? (
        <p className="metric-value text-metric text-faint mt-1">—</p>
      ) : (
        <p className="metric-value text-metric mt-1">
          {value}
          <span className="metric-unit">{unit}</span>
        </p>
      )}
    </div>
  );
}

/**
 * 구성원 한 줄 — 이름 · 오늘 · 이번 주 점 일곱 · 며칠 이어서.
 * 아이는 누르면 아이 기록으로, 아직 안 들어온 자리는 「초대하기」.
 */
function MemberLine({
  member,
  me,
  hasAccount,
  logs,
  missions,
  onInvite,
}: {
  member: FitnessMapMember;
  me: boolean;
  hasAccount: boolean | undefined;
  logs: DayLog[];
  missions: Mission[] | undefined;
  onInvite: () => void;
}) {
  const { data: progress } = useProgress(member.profileId);
  const child = member.role === "CHILD";
  const week = weekOf();
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const now = today();

  // 오늘 이 사람이 하는 운동 — 걸음수(자기 신고)는 세지 않는다(규칙 2)
  const mine = (missions ?? []).filter(
    (m) =>
      m.targetMetric !== "STEPS" &&
      (m.startDate ?? "") <= now &&
      now <= (m.endDate ?? "") &&
      m.participants?.some((p) => p.profileId === member.profileId),
  );
  const sessions = mine.flatMap((m) => sessionsOf(m));
  const doneCount = sessions.filter((s) => s.completed).length;
  const today_ =
    mine.length === 0
      ? "오늘 운동 없어요"
      : sessions.length > 0 && doneCount === sessions.length
        ? "오늘 다 했어요"
        : `오늘 ${doneCount} / ${sessions.length}개`;

  const body = (
    <>
      <Initial name={member.name} tone={child ? "signal" : "mark"} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-extrabold">{member.name}</span>
          {me && (
            <span className="bg-sub text-ink-soft text-micro rounded-md px-1.5 py-0.5 font-bold">
              나
            </span>
          )}
        </span>
        <span className="text-caption text-ink-soft block truncate">
          {child ? "자녀" : "부모"} · {member.ageGroup}
          {/* 아이는 부모 폰을 빌려 쓰는 게 기본이라 계정이 없어도 오늘을 적는다. 부모 자리만 「아직 안 들어옴」 */}
          {!child && hasAccount === false ? " · 아직 안 들어옴" : ` · ${today_}`}
        </span>
        {/* 이번 주 월~일 — 움직인 날만 채운다. 쉰 날을 빠진 날처럼 칠하지 않는다 */}
        <span
          className="mt-1.5 flex gap-1"
          aria-label={`이번 주 ${week.days.filter((d) => (byDate.get(d)?.minutes ?? 0) > 0).length}일 움직였어요`}
        >
          {week.days.map((d) => {
            const moved = (byDate.get(d)?.minutes ?? 0) > 0;
            return (
              <span
                key={d}
                aria-hidden
                className={cn(
                  "size-2.5 rounded-full",
                  moved ? "bg-signal" : "bg-sub",
                  d === now && !moved && "ring-signal ring-1",
                )}
              />
            );
          })}
        </span>
      </span>
      {progress && progress.streakDays > 1 && (
        <span className="text-caption shrink-0">
          <StreakChip days={progress.streakDays} />
        </span>
      )}
    </>
  );

  return (
    <li>
      {child ? (
        <NavLink
          href={`/parent/child/${member.profileId}`}
          className="press flex min-h-16 items-center gap-3 py-3"
        >
          {body}
          <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
        </NavLink>
      ) : (
        <div className="flex min-h-16 items-center gap-3 py-3">
          {body}
          {hasAccount === false && (
            <button
              type="button"
              onClick={onInvite}
              className="press bg-sub grid min-h-10 shrink-0 place-items-center rounded-xl px-3 text-xs font-extrabold"
            >
              초대하기
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <AppBar backHref="/parent" title="우리 가족" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
