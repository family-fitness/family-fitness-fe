"use client";

import { Users } from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { MemberCard } from "@/components/domain/member-card";
import { NextAction } from "@/components/domain/next-action";
import { useFitnessMap, useLatestCoachRun, useMissions } from "@/lib/api/queries";
import { FAMILY_ID } from "@/mocks/data";

/**
 * 가족 체력 지도 — 앱의 메인 화면.
 *
 * 화면 전체가 GET /families/{id}/fitness-map 호출 하나로 온다.
 *
 * 위계
 *   1. 지금 할 일 한 줄 — 사람이 행동으로 넘어가는 자리
 *   2. 구성원 카드 — 기록이 주인공이라 숫자를 크게 띄운다
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
        <PageHeader eyebrow="FAMILY" title="우리 가족" />
        <Screen>
          <EmptyState icon={Users} title="기록을 불러오지 못했어요" description={error.message} />
        </Screen>
      </>
    );
  }

  const { family, members } = data;
  const measurable = members.filter((m) => m.profile.measurable);
  const measured = measurable.filter((m) => m.overallPercentile !== null);
  const aboveAverage = measured.filter((m) => (m.overallPercentile ?? 0) >= 50).length;

  return (
    <>
      <PageHeader
        eyebrow="FAMILY"
        title={family.name}
        meta={
          <>
            <span>
              {measurable.length}명 중 {measured.length}명 측정
            </span>
            <span className="text-faint">
              {measured.length === 0
                ? "아직 기록 없음"
                : aboveAverage === measured.length
                  ? "모두 또래 평균 위"
                  : `${aboveAverage}명이 또래 평균 위`}
            </span>
          </>
        }
      />

      <Screen className="space-y-5">
        <NextAction coachRun={coachRun} missions={missions} members={members} />

        <section className="space-y-2.5">
          <div className="section-head">
            <h2>구성원</h2>
          </div>
          <ul className="space-y-2.5">
            {members.map((member, index) => (
              <li
                key={member.profile.id}
                className="rise"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <MemberCard member={member} delay={index * 0.05} />
              </li>
            ))}
          </ul>
        </section>

        <p className="text-faint px-1 text-[0.7rem] leading-relaxed">
          숫자는 또래 100명 중 자기 자리예요. 국민체력100 규준에 따라 나이와 성별이 같은 사람들과
          비교합니다.
        </p>
      </Screen>
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <PageHeader eyebrow="FAMILY" title="우리 가족" />
      <Screen className="space-y-5">
        <Skeleton className="rounded-card h-14" />
        <div className="space-y-2.5">
          <Skeleton className="h-6 w-20" />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
          <MemberCardSkeleton />
        </div>
      </Screen>
    </>
  );
}
