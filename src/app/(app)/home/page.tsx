"use client";

import { Users } from "lucide-react";

import { AppHeader } from "@/components/app-shell/app-header";
import { Screen } from "@/components/app-shell/screen";
import { Card, Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { FamilySummary, MemberCard, UnmeasuredNote } from "@/components/domain/member-card";
import { NextAction } from "@/components/domain/next-action";
import { PercentileGauge, type GaugeMark } from "@/components/domain/percentile-gauge";
import { useFitnessMap, useLatestCoachRun, useMissions } from "@/lib/api/queries";
import { FAMILY_ID } from "@/mocks/data";

/**
 * 가족 체력 지도 — 앱의 메인 화면.
 *
 * 화면 전체가 GET /families/{id}/fitness-map 호출 하나로 온다.
 * 구성원마다 따로 부르지 않는다.
 *
 * 위계는 셋이다.
 *   1. 지금 할 일 한 줄 — 사람이 행동으로 넘어가는 자리
 *   2. 눈금 — 우리 가족이 또래 중 어디에 있는가
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
          <EmptyState icon={Users} title="지도를 불러오지 못했어요" description={error.message} />
        </Screen>
      </>
    );
  }

  const { family, members } = data;
  const measured = members.filter((m) => m.overallPercentile !== null);
  const unmeasured = members.filter((m) => m.overallPercentile === null);

  const marks: GaugeMark[] = measured.map((m) => ({
    id: m.profile.id,
    label: m.profile.displayName,
    percentile: m.overallPercentile ?? 0,
  }));

  return (
    <>
      <AppHeader title={family.name} />

      <Screen className="space-y-5">
        <NextAction coachRun={coachRun} missions={missions} members={members} />

        <Card className="space-y-4">
          <FamilySummary members={members} />

          {marks.length > 0 ? (
            <PercentileGauge marks={marks} />
          ) : (
            <p className="text-mute py-8 text-center text-sm">
              첫 측정을 등록하면 우리 가족 지도가 그려져요.
            </p>
          )}

          <UnmeasuredNote members={unmeasured} />
        </Card>

        <Section title="구성원">
          <ul className="space-y-3">
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
      <Screen className="space-y-5">
        <Skeleton className="rounded-card h-13 w-full" />
        <Card className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-60 w-full" />
        </Card>
        <div className="space-y-3">
          <Skeleton className="h-5 w-16" />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
        </div>
      </Screen>
    </>
  );
}
