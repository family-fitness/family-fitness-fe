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
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const { data: league, isLoading, error } = useFamilyLeague(familyId, monthOf(today()));
  // 리그는 덤이다 — 못 받으면 줄을 접는다. 다시 받기는 리그 화면에서
  if (error) return null;
  if (isLoading) return <Skeleton className={cn("h-14 w-full", className)} />;
  if (!league) return null;

  const art = tierArt(league.tier);
  const place = league.rank != null ? ` · ${league.groupSize}가족 중 ${league.rank}등` : "";
  // 셀 날이 아직 없으면 0% 가 아니라 비어 있다
  const note =
    league.rate != null
      ? `이번 달 달성률 ${league.rate}% · ${league.daysLeft}일 남음`
      : "아직 순위가 없어요";
  return (
    <NavLink
      href="/parent/league"
      className={cn("press flex min-h-14 items-center gap-3", className)}
      aria-label={`${tierName(league.tier)} 리그${place} · ${note}`}
    >
      {artFor(art) && <ArtIcon name={art} className="size-10" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">
          {tierName(league.tier)} 리그{place}
        </span>
        <span className="text-caption text-ink-soft block">{note}</span>
      </span>
      <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
    </NavLink>
  );
}
