"use client";

import { ChevronRight } from "lucide-react";

import { ArtIcon } from "@/components/ui/art-icon";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyLeague } from "@/lib/api/queries";
import { artFor } from "@/lib/art";
import { daysLeftText, tierArt, tierName } from "@/lib/league";
import { monthOf, today } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 가족 리그. 가족 대시보드 「이번 달 우리 가족」 의 맨 위에 서고, 누르면 리그 화면이다.
 *
 * 티어 뱃지를 가운데 두고 그 아래에 「골드 리그」, 「10가족 중 4등」, 달성률을 차례로 둔다.
 * 뱃지는 아래 숫자 칸보다 커 보이지 않게 48px 로 둔다(10/1 「리그 뱃지가 너무 크다」). 큰 뱃지는 리그 화면에만.
 * 가족 단위로만 겨룬다. 집 안에서 누가 더 했는지는 나오지 않는다(규칙 10).
 */
export function LeagueRow({
  familyId,
  className,
}: {
  familyId: string | undefined;
  className?: string;
}) {
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다. isLoading 으로 본다
  const { data: league, isLoading, error } = useFamilyLeague(familyId, monthOf(today()));
  // 리그는 덤이다. 못 받으면 줄을 접는다. 다시 받기는 리그 화면에서
  if (error) return null;
  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center py-4", className)}>
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="mt-2 h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>
    );
  }
  if (!league) return null;

  const art = tierArt(league.tier);
  const place = league.rank != null ? `${league.groupSize}가족 중 ${league.rank}등` : null;
  // 셀 날이 아직 없으면 0% 가 아니라 비어 있다
  const note =
    league.rate != null
      ? `이번 달 달성률 ${league.rate}%, ${daysLeftText(league.daysLeft)}`
      : "아직 순위가 없어요";
  return (
    <NavLink
      href="/parent/league"
      className={cn("press flex flex-col items-center py-4 text-center", className)}
      aria-label={`${tierName(league.tier)} 리그${place ? `, ${place}` : ""}. ${note}`}
    >
      {artFor(art) ? (
        <ArtIcon name={art} className="size-12" />
      ) : (
        // 메달 그림이 오기 전에는 티어 이름을 그 자리에
        <span className="text-signal-deep grid size-12 place-items-center text-base font-extrabold">
          {tierName(league.tier)}
        </span>
      )}
      <span className="mt-2 inline-flex items-center gap-0.5 text-xl font-extrabold">
        {tierName(league.tier)} 리그
        <ChevronRight aria-hidden className="text-faint size-5" strokeWidth={2.4} />
      </span>
      {place && <span className="text-signal-deep text-body mt-1 font-extrabold">{place}</span>}
      <span className="text-caption text-ink-soft mt-1.5">{note}</span>
    </NavLink>
  );
}
