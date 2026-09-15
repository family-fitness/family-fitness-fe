"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/illustration";
import { FactorRadar } from "@/components/domain/factor-radar";
import { LinkRow } from "@/components/domain/link-row";
import { useFamilyProfiles, useLatestFitnessTest } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { avatarFor } from "@/lib/avatar";
import { formatDate } from "@/lib/utils";

/**
 * 구성원 한 명.
 *
 * **측정할 수 없는 사람이 있다.** `measurable === false`(만 4세 미만)면 측정으로
 * 가는 줄을 비활성화하지 않고 **아예 내지 않는다.** 흐릿한 버튼은 "언젠가 되는
 * 건가" 하고 계속 누르게 만든다.
 */
export default function ProfilePage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { familyId, isPending: sessionPending } = useSession();

  const { data: family, isPending: familyPending } = useFamilyProfiles(familyId);
  const { data: latest } = useLatestFitnessTest(profileId);

  const profile = family?.profiles?.find((p) => p.profileId === profileId);

  if (sessionPending || familyPending) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <>
        <PageHeader eyebrow="PROFILE" title="프로필" back />
        <Screen>
          <EmptyState
            scene="no-record"
            title="찾을 수 없는 프로필이에요"
            description="다른 가족의 프로필이거나 지워진 프로필일 수 있어요."
          />
        </Screen>
      </>
    );
  }

  const hasTest = Boolean(latest?.fitnessTestId);
  const radar = latest?.radar ?? [];

  return (
    <>
      <PageHeader eyebrow="PROFILE" title={profile.name ?? "프로필"} back />

      <Screen className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar parts={avatarFor(profile)} size={72} />
          <div className="min-w-0">
            <p className="text-[1.05rem] font-extrabold">{profile.name}</p>
            <p className="text-ink-soft mt-0.5 text-sm">
              {profile.ageGroup} · {profile.role === "PARENT" ? "부모" : "자녀"}
            </p>
            <p className="text-faint mt-0.5 text-xs">
              {hasTest && latest?.testedOn
                ? `${formatDate(latest.testedOn)} 측정`
                : profile.measurable === false
                  ? "만 4세부터 측정할 수 있어요"
                  : "아직 측정 기록이 없어요"}
            </p>
          </div>
        </div>

        {hasTest && radar.length >= 3 && <FactorRadar points={radar} size={210} />}

        <ul className="divide-rows">
          {/* 측정할 수 없는 사람에게는 이 줄을 내지 않는다 */}
          {profile.measurable !== false && (
            <LinkRow
              href={`/p/${profileId}/measure`}
              art="item/item-tape"
              title={hasTest ? "다시 측정하기" : "첫 측정 입력하기"}
              description="한 항목만 넣어도 결과가 나와요"
            />
          )}
          {hasTest && (
            <LinkRow
              href={`/p/${profileId}/result`}
              art="item/item-clipboard"
              title="측정 결과"
              description="요인별로 어디쯤인지"
            />
          )}
          {hasTest && (
            <LinkRow
              href={`/p/${profileId}/future`}
              art="deco/deco-arrow-up"
              title="10년 뒤"
              description="지금과 같은 조건의 10년 위 연령대"
            />
          )}
          <LinkRow href={`/missions?scope=MINE`} art="item/item-medal" title="참여 중인 미션" />
        </ul>

        {profile.consentRequired && !profile.consentGiven && (
          <p className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold">
            보호자 동의가 없어 측정을 저장할 수 없어요. 설정에서 동의를 켜 주세요.
          </p>
        )}
      </Screen>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <PageHeader eyebrow="PROFILE" title="프로필" back />
      <Screen className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-18 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </Screen>
    </>
  );
}
