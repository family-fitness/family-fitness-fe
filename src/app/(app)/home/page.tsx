"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberRowSkeleton, Skeleton } from "@/components/ui/skeleton";
import { KidHome } from "@/components/domain/kid-home";
import { MemberRow } from "@/components/domain/member-row";
import { NextAction } from "@/components/domain/next-action";
import { ProfileSwitcher } from "@/components/domain/profile-switcher";
import { useCoachRun, useFitnessMap, useMissions } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useCoachRunId } from "@/stores/coach-store";

/**
 * 가족 체력 지도 — 앱의 메인 화면.
 *
 * GET /families/{id}/fitness-map 한 번으로 화면 전체가 온다.
 *
 * **구성원 사이 순위 · 비교를 그리지 않는다.** 서버가 그런 값을 주지 않고,
 * 화면도 비교표가 되면 안 된다. 구성원마다 서버가 만든 headline 한 줄만 보여준다.
 */
export default function HomePage() {
  const { profile, profiles, familyId, isChild, isPending: sessionPending } = useSession();
  const { data, isPending, error } = useFitnessMap(familyId);
  const { data: missionList } = useMissions(familyId);
  const runId = useCoachRunId(familyId);
  const { data: coachRun } = useCoachRun(runId);

  if (sessionPending || isPending) return <HomeSkeleton />;

  if (error || !data) {
    return (
      <>
        <PageHeader eyebrow="FAMILY" title="우리 가족" />
        <Screen>
          <EmptyState
            scene="error"
            title="기록을 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
          />
        </Screen>
      </>
    );
  }

  // 자녀 프로필을 보고 있으면 화면을 통째로 바꾼다
  if (isChild && profile) {
    return (
      <>
        <div className="flex justify-end px-4 pt-3">
          <ProfileSwitcher profiles={profiles} current={profile} />
        </div>
        <KidHome profile={profile} missions={missionList?.missions} />
      </>
    );
  }

  const members = data.members ?? [];
  const measurable = members.filter((m) => m.measurable);
  const measured = measurable.filter((m) => m.latest);

  return (
    <>
      <PageHeader
        eyebrow="FAMILY"
        title={data.familyName ?? "우리 가족"}
        action={<ProfileSwitcher profiles={profiles} current={profile} />}
        meta={
          <>
            <span>
              {measurable.length}명 중 {measured.length}명 측정
            </span>
            <span className="text-faint">
              {measured.length === 0 ? "아직 기록 없음" : "각자 또래와 비교한 값이에요"}
            </span>
          </>
        }
      />

      <Screen className="space-y-6">
        <NextAction
          coachRun={coachRun}
          missions={missionList?.missions}
          members={members}
          canApprove={profile?.role === "PARENT"}
        />

        <section className="space-y-1">
          <div className="section-head">
            <h2>구성원</h2>
          </div>
          <ul className="divide-rows">
            {members.map((member) => (
              <li key={member.profileId}>
                <MemberRow member={member} />
              </li>
            ))}
          </ul>
        </section>

        {/* 서버가 주는 고지 문구를 그대로 쓴다. 고쳐 쓰지 않는다 */}
        {data.disclaimer && (
          <p className="text-faint px-1 text-[0.7rem] leading-relaxed">{data.disclaimer}</p>
        )}
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
