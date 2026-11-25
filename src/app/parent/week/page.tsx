"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { WeekTower } from "@/components/scene/week-tower";
import { useFamilyCalendars, useFamilyProfiles, useWeeklyReport } from "@/lib/api/queries";
import type { DayLog, WeeklyReport } from "@/lib/api/types";
import { useSession } from "@/lib/session";
import { today, weekOf } from "@/lib/today";
import { cn } from "@/lib/utils";
import {
  familyDays,
  familyWeek,
  isThisWeek,
  shiftWeek,
  weekParam,
  weekRangeLabel,
} from "@/lib/week-report";

/**
 * 주간 돌아보기 — 보호자가 지난 주를 돌아본다. 가족 대시보드는 이번 달, 구성원 줄은 이번 주만 보여 줬다.
 *
 *   주 고르기   ‹ 11월 16일 ~ 11월 22일 ›. 지난주부터 열고, 이번 주에서 멈춘다(주소 `?week=`)
 *   우리 가족   운동 시간(확인된 시간 — 대시보드 · 달력과 같은 분) · 완료한 운동
 *   구성원      한 사람이 한 줄, 가족 차례 그대로. 시간으로 줄 세우지 않는다(규칙 10 · 14)
 *
 * 서버가 주는 코치 회차 설명(`summary`)과 응원 수는 쓰지 않는다(lib/week-report).
 */
export default function WeekPage() {
  return (
    <Suspense fallback={<WeekSkeleton />}>
      <WeekView />
    </Suspense>
  );
}

function WeekView() {
  const router = useRouter();
  const search = useSearchParams();
  const now = today();
  const week = weekParam(search.get("week"), now);
  const {
    familyId,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
  const { data: family } = useFamilyProfiles(familyId);
  const { data: report, isLoading, error, refetch } = useWeeklyReport(familyId, week);
  // 요일 기둥 — 구성원마다 그 주 달력을 받아 날짜마다 더한다(대시보드 「이번 주」 와 같은 요청 · 같은 분)
  const days = weekOf(week).days;
  const ids = (family?.profiles ?? []).map((p) => p.profileId ?? "").filter(Boolean);
  const calendars = useFamilyCalendars(familyId, ids, { from: days[0], to: days[6] });
  const logs = familyDays(
    days,
    calendars.map((c) => c.data),
  );

  if (sessionPending) return <WeekSkeleton />;
  if (sessionError) {
    return (
      <>
        <AppBar backHref="/parent/dashboard" title="주간 돌아보기" />
        <Stage wide>
          <ErrorState error={sessionError} onRetry={() => void refetchMe()} />
        </Stage>
      </>
    );
  }

  const go = (weekStart: string) =>
    router.replace(`/parent/week?week=${weekStart}`, { scroll: false });
  const lastAllowed = isThisWeek(week, now);
  const roleOf = (profileId: string | undefined) =>
    family?.profiles?.find((p) => p.profileId === profileId)?.role;

  return (
    <>
      <AppBar backHref="/parent/dashboard" title="주간 돌아보기" />
      <Stage wide className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(shiftWeek(week, -1))}
            aria-label="지난주"
            className="press text-ink-soft grid size-11 place-items-center rounded-full"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <p className="min-w-44 py-2.5 text-center text-base font-extrabold">
            {lastAllowed ? "이번 주" : weekRangeLabel(week)}
          </p>
          <button
            type="button"
            onClick={() => go(shiftWeek(week, 1))}
            disabled={lastAllowed}
            aria-label="다음 주"
            className="press text-ink-soft grid size-11 place-items-center rounded-full disabled:opacity-30"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        {error && !report ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <>
            <FamilyWeek report={report} loading={isLoading} days={days} logs={logs} now={now} />
            <MembersWeek report={report} loading={isLoading} roleOf={roleOf} />
          </>
        )}
      </Stage>
    </>
  );
}

/** 우리 가족 한 주. 아무도 움직이지 않은 주는 「0분」 「0개」 칸 대신 키움이 */
function FamilyWeek({
  report,
  loading,
  days,
  logs,
  now,
}: {
  report?: WeeklyReport;
  loading: boolean;
  days: string[];
  /** 요일마다 가족이 움직인 분. 달력이 다 오기 전에는 없다 */
  logs: DayLog[] | undefined;
  now: string;
}) {
  const { minutes, completed, moved } = familyWeek(report);
  return (
    <section className="card-hero" aria-label="우리 가족 한 주">
      <CardHead title="우리 가족" />
      {loading ? (
        <div className="mt-1 grid grid-cols-2">
          <Skeleton className="m-1 h-16" />
          <Skeleton className="m-1 h-16" />
        </div>
      ) : !moved ? (
        <EmptyState size="card" scene="no-mission" title="이 주는 운동 기록이 없어요" />
      ) : (
        <>
          <div className="mt-1 grid grid-cols-2">
            <WeekStat label="가족 운동 시간" value={minutes} unit="분" />
            <WeekStat label="완료한 운동" value={completed} unit="개" left />
          </div>
          {/* 요일마다 가족이 움직인 분. 누가 얼마나 했는지는 기둥으로 가르지 않는다 */}
          {logs ? (
            <WeekTower
              days={days}
              logs={logs}
              today={now}
              height={140}
              className="border-line -mx-1 mt-1 border-t pt-2"
            />
          ) : (
            <Skeleton className="mt-3 aspect-[320/140] w-full rounded-2xl" />
          )}
        </>
      )}
    </section>
  );
}

function WeekStat({
  label,
  value,
  unit,
  left,
}: {
  label: string;
  value: number;
  unit: string;
  left?: boolean;
}) {
  return (
    <div className={cn("px-1 py-3", left && "border-line border-l pl-4")}>
      <p className="metric-label">{label}</p>
      <p className="metric-value text-metric mt-1">
        {value}
        <span className="metric-unit">{unit}</span>
      </p>
    </div>
  );
}

/** 구성원마다 한 줄 — 가족 차례 그대로. 움직이지 않은 사람은 0 대신 「기록이 없어요」 */
function MembersWeek({
  report,
  loading,
  roleOf,
}: {
  report?: WeeklyReport;
  loading: boolean;
  roleOf: (profileId: string | undefined) => string | undefined;
}) {
  const members = report?.members ?? [];
  return (
    <section className="card" aria-label="구성원">
      <CardHead title="구성원" meta={loading ? undefined : `${members.length}명`} />
      {loading ? (
        <div className="mt-2 space-y-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : (
        <ul className="divide-rows mt-1">
          {members.map((m) => {
            const minutes = m.verifiedMinutes ?? 0;
            const done = m.completedMissions ?? 0;
            return (
              <li key={m.profileId} className="flex items-center gap-3 py-3">
                <ProfileAvatar
                  profileId={m.profileId}
                  name={m.name}
                  tone={roleOf(m.profileId) === "CHILD" ? "signal" : "mark"}
                />
                <span className="min-w-0 flex-1 truncate font-extrabold">{m.name}</span>
                {minutes > 0 || done > 0 ? (
                  <span className="shrink-0 text-sm font-bold">
                    {minutes}분
                    <span className="text-ink-soft ml-1.5 font-semibold">완료 {done}개</span>
                  </span>
                ) : (
                  <span className="text-ink-soft text-caption shrink-0 font-semibold">
                    기록이 없어요
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function WeekSkeleton() {
  return (
    <>
      <AppBar backHref="/parent/dashboard" title="주간 돌아보기" />
      <Stage wide className="space-y-3">
        <Skeleton className="mx-auto h-11 w-52 rounded-full" />
        <Skeleton className="h-36 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
