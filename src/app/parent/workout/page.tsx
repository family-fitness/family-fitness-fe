"use client";

import { Check, ChevronRight, Play } from "lucide-react";
import Link from "next/link";

import { HomeHeader } from "@/components/app-shell/home-header";
import { ParentHeadActions } from "@/components/app-shell/parent-head-actions";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import type { Mission } from "@/lib/api/types";
import { useCurrentMissions, useRestDays } from "@/lib/api/queries";
import { familyToday, partAction, partLine, partOf } from "@/lib/mission";
import { sessionsOf, totalMinutes } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { longDate, monthOf, today } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 운동 탭. 오늘 가족 운동과 운동을 짜는 길.
 *
 *   「오늘 가족 운동」  오늘 하는 운동마다 누가 얼마나 했는지. 내 몫이 있으면 시작하기
 *   「운동 짜기」      AI 코치에게 받기, 직접 만들기, 운동 찾기
 *
 * 「매번 같이」 를 고른 보호자도 운동을 받는다. 내 몫은 이 화면에서 시작한다(`/parent/m/[missionId]`).
 * 쉬는 날에는 AI 코치에게 오늘 운동을 받는 단추를 두지 않는다(규칙 15). 직접 만들기는 다른 날에 넣을 수 있어 둔다.
 */
export default function WorkoutTabPage() {
  const { familyId, profile, isPending, error: sessionError, refetch: refetchMe } = useSession();
  const {
    data: missions,
    isPending: missionsPending,
    error: missionsError,
    refetch: refetchMissions,
  } = useCurrentMissions(familyId);
  const now = today();
  const { data: restDays } = useRestDays(familyId, monthOf(now));
  const restToday = restDays?.days.includes(now) ?? false;
  const myId = profile?.profileId;

  const header = <HomeHeader eyebrow={longDate()} title="운동" actions={<ParentHeadActions />} />;

  if (sessionError) {
    return (
      <>
        {header}
        <Stage wide>
          <ErrorState error={sessionError} onRetry={() => void refetchMe()} />
        </Stage>
      </>
    );
  }

  const list = familyToday(missions?.missions, now);
  // 내 몫이 있는 운동을 위로. 나머지는 받은 차례대로
  const ordered = [...list.filter((m) => partOf(m, myId)), ...list.filter((m) => !partOf(m, myId))];

  return (
    <>
      {header}
      <Stage wide className="space-y-3">
        <section className="card-hero" aria-label="오늘 가족 운동">
          <CardHead title="오늘 가족 운동" meta={missions ? `${list.length}개` : undefined} />
          {isPending || (missionsPending && !missionsError) ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : !missions ? (
            // 못 받았으면 「오늘 운동이 없어요」 로 그리지 않는다. 같은 운동을 한 번 더 받게 된다
            <ErrorState error={missionsError} onRetry={() => void refetchMissions()} />
          ) : ordered.length === 0 ? (
            <p className="text-ink-soft mt-1 text-sm">
              {restToday ? "오늘은 쉬는 날이에요" : "오늘 잡힌 운동이 없어요"}
            </p>
          ) : (
            <ul className="divide-rows">
              {ordered.map((m) => (
                <MissionLine key={m.missionId} mission={m} myId={myId} />
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-label="운동 짜기">
          <CardHead title="운동 짜기" />
          {!restToday && (
            <Link
              href="/plan"
              className="press bg-signal-strong mt-2 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
            >
              <ArtIcon name="icon/menu-ai" className="size-5" />
              AI 코치에게 운동 받기
            </Link>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NavLink
              href="/plan/custom"
              className="press bg-sub flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold"
            >
              직접 만들기
            </NavLink>
            <NavLink
              href="/videos"
              className="press bg-sub flex min-h-12 items-center justify-center gap-0.5 rounded-2xl text-sm font-extrabold"
            >
              운동 찾기
              <ChevronRight aria-hidden className="text-faint size-4" />
            </NavLink>
          </div>
        </section>
      </Stage>
    </>
  );
}

/**
 * 운동 한 줄. 이름과 시간, 하는 사람마다 얼마나 했는지. 내 몫이 있으면 아래에 시작 단추.
 * 사람 줄은 받은 차례대로 둔다. 한 만큼으로 줄 세우면 가족끼리 견주게 된다(규칙 10)
 */
function MissionLine({ mission, myId }: { mission: Mission; myId: string | undefined }) {
  const mine = partOf(mission, myId);
  const first = mission.participants?.[0]?.profileId;
  const minutes = totalMinutes(sessionsOf(mission, myId ?? first));

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate font-extrabold">{mission.title}</p>
        <span className="text-caption text-ink-soft shrink-0 font-semibold">{minutes}분</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {(mission.participants ?? []).map((p) => {
          const part = partOf(mission, p.profileId);
          const me = p.profileId === myId;
          return (
            <li key={p.profileId} className="flex items-center gap-2 text-sm">
              <ProfileAvatar profileId={p.profileId} name={p.name ?? ""} size="sm" tone="sub" />
              <span className="min-w-0 flex-1 truncate font-bold">
                {p.name}
                {me && <span className="text-ink-soft text-caption ml-1 font-bold">나</span>}
              </span>
              <span
                className={cn(
                  "text-caption shrink-0 font-bold",
                  part && part.done >= part.total ? "text-done" : "text-ink-soft",
                )}
              >
                {part ? partLine(part) : ""}
              </span>
            </li>
          );
        })}
      </ul>
      {mine &&
        (mine.total > 0 && mine.done >= mine.total ? (
          <NavLink
            href={`/parent/m/${mission.missionId}`}
            className="press bg-done-soft text-done mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
          >
            <Check aria-hidden className="size-4" strokeWidth={3} />
            {partAction(mine)}
          </NavLink>
        ) : (
          <NavLink
            href={`/parent/m/${mission.missionId}`}
            className="press bg-signal-strong mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
          >
            <Play aria-hidden className="size-4 fill-current" />
            {partAction(mine)}
          </NavLink>
        ))}
    </li>
  );
}
