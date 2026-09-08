"use client";

import { Users } from "lucide-react";

import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberCardSkeleton, Skeleton, TrackSkeleton } from "@/components/ui/skeleton";
import { MemberCard } from "@/components/domain/member-card";
import { NextAction } from "@/components/domain/next-action";
import { Track, type Runner } from "@/components/domain/track";
import { useFitnessMap, useLatestCoachRun, useMissions } from "@/lib/api/queries";
import { FAMILY_ID } from "@/mocks/data";

/**
 * 가족 체력 지도 — 앱의 메인 화면.
 *
 * 화면 전체가 GET /families/{id}/fitness-map 호출 하나로 온다.
 *
 * 위계는 셋이다.
 *   1. 지금 할 일 한 줄 — 사람이 행동으로 넘어가는 자리
 *   2. 트랙 — 우리 가족이 또래 중 어디쯤인가
 *   3. 구성원 카드 — 각자 자세히
 */
export default function HomePage() {
  // TODO 인증이 붙으면 로그인한 계정의 가족 id 로 바꾼다
  const familyId = FAMILY_ID;

  const { data, isPending, error } = useFitnessMap(familyId);
  const { data: coachRun } = useLatestCoachRun(familyId);
  const { data: missions } = useMissions(familyId);

  if (isPending) return <HomeSkeleton />;

  if (error) {
    return (
      <>
        <AppHeader title="우리 가족" />
        <Screen>
          <EmptyState icon={Users} title="트랙을 불러오지 못했어요" description={error.message} />
        </Screen>
      </>
    );
  }

  const { family, members } = data;
  const measured = members.filter((m) => m.overallPercentile !== null);

  const runners: Runner[] = members.map((m) => ({
    id: m.profile.id,
    name: m.profile.displayName,
    percentile: m.overallPercentile,
    grade: m.overallGrade,
    cannotRun: !m.profile.measurable,
  }));

  const aboveAverage = measured.filter((m) => (m.overallPercentile ?? 0) >= 50).length;

  return (
    <>
      <AppHeader title={family.name} />

      <Screen className="space-y-4">
        <NextAction coachRun={coachRun} missions={missions} members={members} />

        <Card className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[0.95rem] font-bold">우리 가족 트랙</h2>
            <span className="text-faint text-xs">
              {measured.length === 0
                ? "아직 기록이 없어요"
                : aboveAverage === measured.length
                  ? `${measured.length}명 모두 또래 평균 위`
                  : `${measured.length}명 중 ${aboveAverage}명이 또래 평균 위`}
            </span>
          </div>

          <Track runners={runners} />

          <p className="text-faint text-[0.68rem]">
            숫자는 또래 100명 중 자기 자리예요. 나이와 성별이 같은 사람들과 비교합니다.
          </p>
        </Card>

        <Section title="구성원">
          <ul className="space-y-2.5">
            {members.map((member) => (
              <li key={member.profile.id}>
                <MemberCard member={member} />
              </li>
            ))}
          </ul>
        </Section>
      </Screen>
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <AppHeader title="우리 가족" />
      <Screen className="space-y-4">
        <Skeleton className="rounded-card h-13" />
        <Card className="space-y-3 p-4">
          <Skeleton className="h-5 w-28" />
          <TrackSkeleton />
        </Card>
        <div className="space-y-2.5">
          <Skeleton className="h-5 w-16" />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
        </div>
      </Screen>
    </>
  );
}
