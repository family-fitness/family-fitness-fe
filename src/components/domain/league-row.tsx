"use client";

import { ChevronRight } from "lucide-react";

import { ArtIcon } from "@/components/ui/art-icon";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyLeague } from "@/lib/api/queries";
import { artFor } from "@/lib/art";
import { tierArt, tierName } from "@/lib/league";
import { monthOf, today } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 가족 리그 한 줄 — 「골드 리그 · 10가족 중 4등 · 달성률 82%」. 누르면 리그 화면.
 * 가족 대시보드에 선다. 가족 단위로만 겨룬다 — 집 안에서 누가 더 했는지는 나오지 않는다.
 */
export function LeagueRow({
  familyId,
  className,
}: {
  familyId: string | undefined;
  className?: string;
}) {
  const { data: league, isPending, error } = useFamilyLeague(familyId, monthOf(today()));
  // 리그는 덤이다 — 못 받으면 줄을 접는다. 다시 받기는 리그 화면에서
  if (error) return null;
  if (isPending || !league) return <Skeleton className={cn("h-14 w-full", className)} />;

  const art = tierArt(league.tier);
  return (
    <NavLink
      href="/parent/league"
      className={cn("press flex min-h-14 items-center gap-3", className)}
      aria-label={`${tierName(league.tier)} 리그 · ${league.groupSize}가족 중 ${league.rank}등 · 달성률 ${league.rate}%`}
    >
      {artFor(art) && <ArtIcon name={art} className="size-10" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">
          {tierName(league.tier)} 리그 · {league.groupSize}가족 중 {league.rank}등
        </span>
        <span className="text-caption text-ink-soft block">
          이번 달 달성률 {league.rate}% · {league.daysLeft}일 남음
        </span>
      </span>
      <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
    </NavLink>
  );
}
