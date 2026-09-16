"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { SectionTitle, Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorRadar } from "@/components/domain/factor-radar";
import { ScoreDial } from "@/components/domain/score-dial";
import { daysSince } from "@/lib/today";
import { useFamilyProfiles, useFitnessMap, useLatestFitnessTest } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useBodyStore } from "@/stores/body-store";
import { formatDate, withJosa } from "@/lib/utils";

/**
 * 아이 한 명 자세히 — 어떻게 자라고 있나.
 * ▲ 서버가 `/fitness-tests/latest` 만 줘서 추이를 그릴 수 없다. 이력 조회를 요청해 뒀다.
 */
export default function ChildDetailPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { familyId, isPending } = useSession();

  const { data: family, error: familyError, refetch } = useFamilyProfiles(familyId);
  const { data: map } = useFitnessMap(familyId);
  const {
    data: latest,
    isPending: latestPending,
    error: latestError,
  } = useLatestFitnessTest(profileId);
  const body = useBodyStore((s) => s.byProfile[profileId]);

  const profile = family?.profiles?.find((p) => p.profileId === profileId);
  const member = map?.members?.find((m) => m.profileId === profileId);

  if (isPending || latestPending) {
    return (
      <>
        <AppBar back title="자라는 기록" />
        <Stage className="space-y-6">
          <Skeleton className="mx-auto size-44 rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </Stage>
      </>
    );
  }

  // 불러오지 못한 것과 없는 것은 다르다. 섞으면 서버가 죽었을 때
  // 부모에게 "그런 아이는 없습니다" 라고 말하게 된다
  const failure = familyError ?? latestError;
  if (failure) {
    return (
      <>
        <AppBar back title="자라는 기록" />
        <Stage>
          <ErrorState error={failure} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <AppBar back title="자라는 기록" />
        <Stage>
          <EmptyState
            scene="no-record"
            title="찾을 수 없는 프로필이에요"
            description="다른 가족의 프로필이거나 지워진 프로필일 수 있어요."
          />
        </Stage>
      </>
    );
  }

  const score = member?.latest?.overallPercentile ?? null;
  const days = daysSince(latest?.testedOn);
  const radar = latest?.radar ?? [];

  return (
    <>
      <AppBar back title={`${profile.name} 기록`} />
      <Stage className="space-y-8">
        <section className="pt-1">
          <ScoreDial score={score} size={180} label={`${profile.name} 신체 점수`} />
        </section>

        {/* 지금 몸 */}
        <section>
          <SectionTitle action={<Illustration name="item/item-growth-tree" size={30} />}>
            지금 몸
          </SectionTitle>
          <dl className="divide-rows">
            <BodyRow label="나이대" value={profile.ageGroup ?? "-"} />
            <BodyRow
              label="키"
              value={body ? `${body.heightCm}cm` : "아직 안 적었어요"}
              note={body && formatDate(body.measuredOn)}
            />
            <BodyRow
              label="몸무게"
              value={body ? `${body.weightKg}kg` : "아직 안 적었어요"}
              note={body && formatDate(body.measuredOn)}
            />
            <BodyRow
              label="마지막으로 잰 날"
              value={
                latest?.testedOn
                  ? `${formatDate(latest.testedOn)}${days != null ? ` · ${days}일 전` : ""}`
                  : "아직 안 쟀어요"
              }
            />
          </dl>

          {/* 없는 걸 있는 척 그리지 않는다 */}
          <p className="text-faint text-caption mt-3 leading-relaxed">
            지난 기록을 나란히 보여드리려면 서버에 기록이 쌓여야 해요. 준비되는 대로 여기에 변화
            그래프가 생깁니다.
          </p>
        </section>

        {radar.length >= 3 && (
          <section>
            <SectionTitle>요인별로 보면</SectionTitle>
            <FactorRadar points={radar} size={200} />
          </section>
        )}

        <section className="space-y-2">
          <Link
            href={`/p/${profileId}/measure`}
            className="press bg-signal block rounded-2xl py-4 text-center text-base font-extrabold text-white"
          >
            {withJosa(profile.name ?? "아이", "은는")} 다시 재기
          </Link>
          <Link
            href={`/p/${profileId}/result`}
            className="press border-line block rounded-2xl border py-4 text-center text-base font-bold"
          >
            측정 결과 자세히
          </Link>
        </section>

        {!latest?.fitnessTestId && (
          <div className="border-line flex items-center gap-3 rounded-2xl border border-dashed p-4">
            <Illustration
              name="scene/scene-first-body"
              fallback="scene/scene-first-measure"
              size={52}
            />
            <p className="text-ink-soft text-sm leading-relaxed">
              한 가지만 재도 또래 중 어디쯤인지 바로 보여요.
            </p>
          </div>
        )}
      </Stage>
    </>
  );
}

function BodyRow({ label, value, note }: { label: string; value: string; note?: string | false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3.5">
      <dt className="text-sm font-bold">{label}</dt>
      <dd className="text-ink-soft text-right text-sm">
        {value}
        {note && <span className="text-faint text-caption ml-1.5">{note}</span>}
      </dd>
    </div>
  );
}
