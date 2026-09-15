"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeeklyReport } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";

/**
 * 주간 리포트.
 *
 * **`activeMinutes` 와 `verifiedMinutes` 를 나눠 보여준다.** 전자는 기록된 전부,
 * 후자는 서버가 실제로 확인한 만큼이다. 두 수를 하나로 합치면 자기 신고가
 * 실측인 척하게 된다 — 이 서비스가 하지 않기로 한 일이다.
 */
export default function WeeklyReportPage() {
  const { familyId, isPending: sessionPending } = useSession();
  const { data: report, isPending } = useWeeklyReport(familyId);

  if (sessionPending || isPending) return <ReportSkeleton />;

  if (!report) {
    return (
      <>
        <PageHeader eyebrow="REPORT" title="이번 주 기록" back />
        <Screen>
          <EmptyState
            scene="no-record"
            title="아직 기록이 없어요"
            description="미션을 시작하면 한 주 동안 얼마나 움직였는지 여기에 모여요."
          />
        </Screen>
      </>
    );
  }

  const members = report.members ?? [];
  const stats = report.missionStats;
  const totalMinutes = members.reduce((sum, m) => sum + (m.activeMinutes ?? 0), 0);
  // 이번 주 미션을 전부 끝냈을 때만 트로피로 바꾼다. 늘 트로피면 아무 뜻이 없다
  const allDone = (stats?.total ?? 0) > 0 && stats?.completed === stats?.total;
  const maxMinutes = Math.max(1, ...members.map((m) => m.activeMinutes ?? 0));

  return (
    <>
      <PageHeader
        eyebrow="REPORT"
        title="이번 주 기록"
        back
        meta={
          report.weekStart && report.weekEnd ? (
            <span>
              {formatDate(report.weekStart)} ~ {formatDate(report.weekEnd)}
            </span>
          ) : undefined
        }
      />

      <Screen className="space-y-8">
        {/* 가족 전체 한 줄 */}
        <div className="flex items-center gap-4">
          <Illustration name={allDone ? "item/item-trophy" : "item/item-calendar"} size={72} />
          <div className="min-w-0">
            <p className="text-ink-soft text-sm font-semibold">가족이 함께 움직인 시간</p>
            <p className="board-num text-[3.2rem] leading-none">
              {totalMinutes}
              <span className="text-ink-soft ml-1 text-lg font-bold">분</span>
            </p>
            <p className="text-faint mt-1 text-xs">
              미션 {stats?.completed ?? 0}／{stats?.total ?? 0}개 완료 · 응원{" "}
              {report.cheerCount ?? 0}번
            </p>
            {allDone && (
              <p className="text-done mt-1 text-xs font-bold">이번 주 미션을 다 끝냈어요</p>
            )}
          </div>
        </div>

        {report.summary && (
          <p className="text-ink-soft text-sm leading-relaxed">{report.summary}</p>
        )}

        <section>
          <div className="section-head">
            <h2>구성원별</h2>
          </div>
          <ul className="divide-rows">
            {members.map((m) => {
              const active = m.activeMinutes ?? 0;
              const verified = m.verifiedMinutes ?? 0;
              return (
                <li key={m.profileId} className="py-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold">{m.name}</span>
                    <span className="tabular text-ink-soft text-sm">
                      {active}분
                      {(m.completedMissions ?? 0) > 0 && (
                        <span className="text-faint"> · 미션 {m.completedMissions}개</span>
                      )}
                    </span>
                  </div>

                  {/* 막대 하나에 두 값을 겹쳐 그린다. 확인된 만큼이 진한 부분이다 */}
                  <div className="record-rail mt-1.5">
                    <span
                      className="record-fill bg-signal-soft"
                      style={{ width: `${(active / maxMinutes) * 100}%` }}
                      aria-hidden
                    />
                    <span
                      className="record-fill"
                      style={{ width: `${(verified / maxMinutes) * 100}%` }}
                      aria-hidden
                    />
                  </div>

                  <p className="text-faint mt-1 text-[0.7rem]">
                    {verified > 0
                      ? `${verified}분은 타이머·영상으로 확인됐어요`
                      : active > 0
                        ? "모두 직접 입력한 기록이에요"
                        : "이번 주 기록이 없어요"}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="text-faint text-[0.7rem] leading-relaxed">
          타이머와 영상 재생은 앱이 직접 확인한 시간이고, 걸음수처럼 직접 적은 기록은 확인된 시간에
          들어가지 않아요.
        </p>
      </Screen>
    </>
  );
}

function ReportSkeleton() {
  return (
    <>
      <PageHeader eyebrow="REPORT" title="이번 주 기록" back />
      <Screen className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-18 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        ))}
      </Screen>
    </>
  );
}
