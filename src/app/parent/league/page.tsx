"use client";

import { Fragment } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RestCardRow } from "@/components/domain/rest-card";
import { useFamilyCalendars, useFamilyLeague, useFitnessMap } from "@/lib/api/queries";
import { artFor } from "@/lib/art";
import { TIERS, nextTier, prevTier, tierArt, tierIndex, tierName, zoneOf } from "@/lib/league";
import { useSession } from "@/lib/session";
import { monthLabel, monthOf, today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";

/**
 * 가족 리그 — 다른 가족들과 한 달 동안 겨룬다(9/25).
 *
 * 매달 브론즈 · 실버 · 골드 · 플래티넘 · 다이아. 달이 끝나면 위 몇 집은 한 칸 올라가고 아래 몇 집은
 * 한 칸 내려간다. 겨루는 값은 **목표 달성률**이다 — 잡힌 운동 날 중 해낸 날(쉬는 날 뺌), 아이들 평균.
 * 체력이 좋은 집도 식구가 많은 집도 유리하지 않다. 이름은 가족 단위로만 — 집 안에서 누가 더 했는지는
 * 어디에도 나오지 않는다(규칙 10). 흐름 시연판(9/17)의 리그는 흐름만 참고했다.
 */
export default function LeaguePage() {
  const { familyId, isPending: sessionPending } = useSession();
  const now = today();
  const month = monthOf(now);
  const {
    data: league,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useFamilyLeague(familyId, month);
  // 오늘 이미 움직인 아이가 있으면 오늘은 쉬는 날로 못 고른다
  const { data: map } = useFitnessMap(familyId);
  const kidIds = (map?.members ?? [])
    .filter((m) => m.role === "CHILD")
    .map((m) => m.profileId ?? "")
    .filter(Boolean);
  const todays = useFamilyCalendars(familyId, kidIds, { from: now, to: now });
  const movedToday = todays.some((q) => (q.data?.days ?? []).some((d) => d.minutes > 0));

  if (error) {
    return (
      <>
        <AppBar backHref="/parent/dashboard" title="가족 리그" />
        <Stage wide>
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />
        </Stage>
      </>
    );
  }
  if (sessionPending || isPending || !league) return <LeagueSkeleton />;

  const zone = zoneOf(league.rank, league.groupSize, league.promote, league.demote);
  const up = nextTier(league.tier);
  const down = prevTier(league.tier);
  const outlook =
    zone === "up" && up
      ? `지금 자리면 다음 달 ${withJosa(tierName(up), "으로로")} 올라가요`
      : zone === "down" && down
        ? `지금 자리면 다음 달 ${withJosa(tierName(down), "으로로")} 내려가요`
        : `지금 자리면 다음 달도 ${tierName(league.tier)}예요`;
  const art = tierArt(league.tier);
  const at = tierIndex(league.tier);

  return (
    <>
      <AppBar backHref="/parent/dashboard" title="가족 리그" />
      <Stage wide className="space-y-3">
        {/* 첫 묶음 — 이번 달 우리 가족의 자리 */}
        <section className="card-hero" aria-label="이번 달 우리 가족">
          <div className="flex items-center gap-4">
            {artFor(art) && <ArtIcon name={art} className="size-16" />}
            <div className="min-w-0 flex-1">
              <p className="metric-label">
                {monthLabel(month)} · {league.daysLeft}일 남음
              </p>
              <p className="text-metric mt-0.5 font-extrabold">{tierName(league.tier)} 리그</p>
              <p className="text-caption text-ink-soft mt-0.5 font-bold">
                {league.groupSize}가족 중 {league.rank}등
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-end justify-between">
              <p className="metric-label">이번 달 달성률</p>
              <p className="metric-value text-metric">
                {league.rate}
                <span className="metric-unit">%</span>
              </p>
            </div>
            <div
              className="record-rail mt-2"
              role="img"
              aria-label={`이번 달 달성률 ${league.rate}%`}
            >
              <span className="record-fill" style={{ width: `${league.rate}%` }} />
            </div>
            <p className="text-signal-deep text-body mt-3 text-center font-extrabold">{outlook}</p>
          </div>

          {/* 티어 사다리 — 지금 자리만 채운다. 지나온 칸은 옅게 */}
          <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="티어">
            {TIERS.map((t, i) => (
              <li
                key={t.id}
                aria-current={i === at ? "step" : undefined}
                className={cn(
                  "text-micro rounded-xl py-2 text-center font-extrabold",
                  i === at
                    ? "bg-signal-strong text-white"
                    : i < at
                      ? "bg-signal-soft text-signal-deep"
                      : "bg-sub text-ink-soft",
                )}
              >
                {t.name}
              </li>
            ))}
          </ol>

          {/* 쉬는 날 카드 — 쓴 날은 달성률에서 빠진다. 리그 곁에 같은 묶음으로 */}
          <div className="border-line mt-4 border-t pt-2">
            <RestCardRow familyId={familyId ?? undefined} movedToday={movedToday} />
          </div>
        </section>

        {/* 둘째 묶음 — 이번 달 순위. 올라가는 자리 · 내려가는 자리를 선으로 가른다 */}
        <section className="card" aria-label="이번 달 순위">
          <CardHead title="이번 달 순위" meta={`${league.groupSize}가족`} />
          <ol className="mt-1">
            {league.standings.map((s, i) => {
              const rank = i + 1;
              const z = zoneOf(rank, league.groupSize, league.promote, league.demote);
              const zonePrev =
                i === 0 ? null : zoneOf(rank - 1, league.groupSize, league.promote, league.demote);
              return (
                <Fragment key={`${s.familyName}-${rank}`}>
                  {z !== zonePrev && z !== "stay" && (
                    <li
                      aria-hidden
                      className="text-micro text-ink-soft border-line mt-2 border-t pt-2 font-extrabold"
                    >
                      {z === "up" ? "다음 달 올라가는 자리" : "다음 달 내려가는 자리"}
                    </li>
                  )}
                  {z === "stay" && zonePrev === "up" && (
                    <li aria-hidden className="border-line mt-2 border-t pt-1" />
                  )}
                  <li
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-2",
                      s.me && "bg-signal-soft",
                    )}
                    aria-current={s.me ? "true" : undefined}
                  >
                    <span className="text-ink-soft w-5 shrink-0 text-right text-sm font-extrabold tabular-nums">
                      {rank}
                    </span>
                    <span
                      className={cn(
                        "w-20 shrink-0 truncate text-sm font-bold",
                        s.me && "text-signal-deep font-extrabold",
                      )}
                    >
                      {s.familyName}
                    </span>
                    <span className="bg-sub h-2 min-w-0 flex-1 overflow-hidden rounded-full">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          s.me ? "bg-signal" : "bg-baseline",
                        )}
                        style={{ width: `${s.rate}%` }}
                      />
                    </span>
                    <span
                      className={cn(
                        "w-10 shrink-0 text-right text-sm font-extrabold tabular-nums",
                        s.me ? "text-signal-deep" : "text-ink-soft",
                      )}
                    >
                      {s.rate}%
                    </span>
                  </li>
                </Fragment>
              );
            })}
          </ol>
          <p className="text-caption text-ink-soft border-line mt-3 border-t pt-3">
            달성률 — 잡힌 운동 날 중 해낸 날 · 쉬는 날은 빼요 · 아이들 평균. 가족 단위로만 겨뤄요.
          </p>
        </section>
      </Stage>
    </>
  );
}

function LeagueSkeleton() {
  return (
    <>
      <AppBar backHref="/parent/dashboard" title="가족 리그" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
