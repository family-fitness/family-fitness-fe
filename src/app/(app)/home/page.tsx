"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberRowSkeleton, Skeleton } from "@/components/ui/skeleton";
import { KidHome } from "@/components/domain/kid-home";
import { MemberRow } from "@/components/domain/member-row";
import { NextAction } from "@/components/domain/next-action";
import { ProfileSwitcher } from "@/components/domain/profile-switcher";
import { useFitnessMap, useLatestCoachRun, useMissions } from "@/lib/api/queries";
import { useProfileStore } from "@/stores/profile-store";
import { FAMILY_ID } from "@/mocks/data";

/**
 * 가족 체력 지도 — 앱의 메인 화면.
 *
 * 화면 전체가 GET /families/{id}/fitness-map 호출 하나로 온다.
 *
 * 위계
 *   1. 지금 할 일 한 줄 — 사람이 행동으로 넘어가는 자리
 *   2. 구성원 목록 — 기록이 주인공이라 숫자를 크게 띄운다
 */
export default function HomePage() {
  // TODO 인증이 붙으면 로그인한 계정의 가족 id 로 바꾼다
  const familyId = FAMILY_ID;

  const { data, isPending, error } = useFitnessMap(familyId);
  const { data: coachRun } = useLatestCoachRun(familyId);
  const { data: missions } = useMissions(familyId);
  const currentProfileId = useProfileStore((s) => s.currentProfileId);

  if (isPending) return <HomeSkeleton />;

  if (error) {
    return (
      <>
        <PageHeader eyebrow="FAMILY" title="우리 가족" />
        <Screen>
          <EmptyState scene="error" title="기록을 불러오지 못했어요" description={error.message} />
        </Screen>
      </>
    );
  }

  const { family, members } = data;
  const profiles = members.map((m) => m.profile);

  // 자녀 프로필을 보고 있으면 화면을 통째로 바꾼다.
  // 부모가 보는 정보(백분위 · 등급 · 약점)를 아이에게 그대로 보여주지 않는다.
  const current = profiles.find((p) => p.id === currentProfileId);
  if (current?.role === "CHILD") {
    return (
      <>
        <div className="flex justify-end px-4 pt-3">
          <ProfileSwitcher profiles={profiles} />
        </div>
        <KidHome profile={current} missions={missions} />
      </>
    );
  }

  const measurable = members.filter((m) => m.profile.measurable);
  const measured = measurable.filter((m) => m.overallPercentile !== null);
  const aboveAverage = measured.filter((m) => (m.overallPercentile ?? 0) >= 50).length;

  return (
    <>
      <PageHeader
        eyebrow="FAMILY"
        title={family.name}
        action={<ProfileSwitcher profiles={profiles} />}
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

      <Screen className="space-y-6">
        <NextAction coachRun={coachRun} missions={missions} members={members} />

        {measured.length === 0 ? (
          <EmptyState
            scene="first-measure"
            title="첫 측정을 등록해 보세요"
            description="집에서 잴 수 있는 항목부터 시작하면 됩니다. 몇 개만 넣어도 또래 중 어디쯤인지 알 수 있어요."
          />
        ) : (
          <Section title="구성원">
            <ul className="divide-rows">
              {members.map((member, index) => (
                <li key={member.profile.id}>
                  <MemberRow member={member} delay={index * 0.06} />
                </li>
              ))}
            </ul>
          </Section>
        )}

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
      <Screen className="space-y-6">
        <Skeleton className="rounded-card h-14" />
        <div>
          <Skeleton className="mb-2 h-6 w-20" />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
        </div>
      </Screen>
    </>
  );
}
