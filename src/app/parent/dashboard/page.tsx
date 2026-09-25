"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteSheet } from "@/components/domain/invite-sheet";
import { LeagueRow } from "@/components/domain/league-row";
import { RestCardRow } from "@/components/domain/rest-card";
import { StreakChip } from "@/components/domain/streak-chip";
import { WeekDots } from "@/components/domain/week-dots";
import type { DayLog, FitnessMapMember, Mission } from "@/lib/api/types";
import {
  useFamilyCalendars,
  useFamilyProfiles,
  useFitnessMap,
  useCurrentMissions,
  useProgress,
} from "@/lib/api/queries";
import { daySummary, dayWork, todayLine } from "@/lib/day";
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
 * 이 화면에서는 구성원끼리 점수를 나란히 세우지 않는다 — 한 사람이 한 줄, 오늘 · 이번 주 · 이어서만(규칙 10).
 * 아이들의 신체 점수를 한 번에 보는 자리는 부모 홈의 「우리 아이」 다(9/25 요청, 등록한 차례로).
 * 흐름 시연판(9/17)의 대시보드는 무엇을 보여 줄지만 참고했다. 모양은 이 앱의 결이다.
 */
export default function FamilyDashboardPage() {
  const { familyId, profile, isPending, error: sessionError, refetch: refetchMe } = useSession();
  const {
    data: map,
    isLoading: mapLoading,
    error: mapError,
    refetch,
    isRefetching,
  } = useFitnessMap(familyId);
  const { data: family } = useFamilyProfiles(familyId);
  const { data: missions, error: missionsError } = useCurrentMissions(familyId);
  // 초대 시트 — 닫힘(undefined) · 누구든(null) · 이 자리로(id)
  const [inviting, setInviting] = useState<string | null | undefined>(undefined);

  const now = today();
  const month = monthOf(now);
  const grid = monthGrid(month);
  const members = map?.members ?? [];
  // 이번 달 칸과 이번 주 점을 한 번에 — 달 초에는 이번 주가 지난달에 걸친다(10/1 목요일이면 9/28~30)
  const week = weekOf(now);
  const ids = members.map((m) => m.profileId ?? "").filter(Boolean);
  const calendars = useFamilyCalendars(familyId, ids, {
    from: week.from < grid.from ? week.from : grid.from,
    to: week.to > grid.to ? week.to : grid.to,
  });

  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar backHref="/parent" title="우리 가족" />
        <Stage wide>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
            retrying={isRefetching}
          />
        </Stage>
      </>
    );
  }
  if (isPending || mapLoading) return <DashboardSkeleton />;

  // 받은 순서가 아니라 아이디로 잇는다 — 아이디 없는 사람이 끼면 기록이 옆 사람에게 붙었다
  const logsOf = (profileId: string | undefined) =>
    (profileId ? calendars[ids.indexOf(profileId)]?.data?.days : undefined) ?? [];
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
  // 칭찬은 아이가 받은 것만 — 아이가 부모에게 돌려보낸 고마워요는 칭찬이 아니다(규칙 12)
  const stickers = members
    .filter((m) => m.role === "CHILD")
    .flatMap((m) => logsOf(m.profileId).filter((d) => monthOf(d.date) === month))
    .reduce((sum, d) => sum + d.stickers.length, 0);
  const profiles = family?.profiles ?? [];
  // 쉬는 날 카드는 가족 단위 — 오늘 쓴 날이면 운동을 권하지 않는다(규칙 15)
  const restToday = members.some((m) => logsOf(m.profileId).find((d) => d.date === now)?.rest);

  return (
    <>
      <AppBar backHref="/parent" title={map?.familyName ?? "우리 가족"} />
      <Stage wide className="space-y-3">
        {/* 첫 묶음 — 이번 달 우리 가족. 누가 했는지 가르지 않고 한 곳에 모은다 */}
        <section className="card-hero" aria-label="이번 달 우리 가족">
          <CardHead title="이번 달 우리 가족" meta={monthLabel(month)} />
          {/* 다른 가족들과 겨루는 자리 — 가족 단위로만. 누르면 리그 화면 */}
          <LeagueRow familyId={familyId ?? undefined} className="mt-1" />
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
          {/* 쉬는 날 카드 — 오늘 이미 움직인 아이가 있으면 오늘은 못 고른다 */}
          <RestCardRow
            familyId={familyId ?? undefined}
            movedToday={members.some(
              (m) =>
                m.role === "CHILD" &&
                (logsOf(m.profileId).find((d) => d.date === now)?.minutes ?? 0) > 0,
            )}
            className="border-line mt-3 border-t pt-2"
          />
          {!restToday && (
            <NavLink
              href="/plan"
              className="press border-line mt-2 flex min-h-12 items-center gap-3 border-t pt-3"
            >
              <ArtIcon name="icon/menu-ai" className="size-8" />
              <span className="min-w-0 flex-1 text-sm font-extrabold">AI 코치에게 운동 받기</span>
              <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
            </NavLink>
          )}
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
                missionsFailed={Boolean(missionsError)}
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
        open={inviting !== undefined}
        onClose={() => setInviting(undefined)}
        familyName={map?.familyName ?? "우리 가족"}
        members={profiles}
        loading={!family}
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
  missionsFailed,
  onInvite,
}: {
  member: FitnessMapMember;
  me: boolean;
  hasAccount: boolean | undefined;
  logs: DayLog[];
  /** 아직 못 받았으면 undefined — 오늘 한마디를 말하지 않는다 */
  missions: Mission[] | undefined;
  missionsFailed: boolean;
  onInvite: () => void;
}) {
  const { data: progress } = useProgress(member.profileId);
  const child = member.role === "CHILD";
  const week = weekOf();
  const now = today();
  const rest = Boolean(logs.find((l) => l.date === now)?.rest);
  // 부모 홈의 아이 줄과 같은 한마디 — 같은 아이의 오늘을 두 화면이 다르게 말하지 않게
  const today_ = missions
    ? todayLine(dayWork(missions, member.profileId, now), rest)
    : missionsFailed
      ? "—"
      : null;

  const body = (
    <>
      <ProfileAvatar
        profileId={member.profileId}
        name={member.name}
        tone={child ? "signal" : "mark"}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-extrabold">{member.name}</span>
          {me && <span className="text-ink-soft text-caption font-bold">나</span>}
        </span>
        <span className="text-caption text-ink-soft block truncate">
          {child ? "자녀" : "부모"} · {member.ageGroup}
          {/* 아이는 부모 폰을 빌려 쓰는 게 기본이라 계정이 없어도 오늘을 적는다. 부모 자리만 「아직 안 들어옴」 */}
          {!child && hasAccount === false ? (
            " · 아직 안 들어옴"
          ) : today_ ? (
            ` · ${today_}`
          ) : (
            <span className="skeleton ml-1 inline-block h-3 w-14 rounded align-middle" />
          )}
        </span>
        <WeekDots days={week.days} logs={logs} />
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
