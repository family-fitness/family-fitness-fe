"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { BandChip, GradeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorIcon } from "@/components/domain/factor-icon";
import { FactorView } from "@/components/domain/factor-view";
import { RecordRow } from "@/components/domain/record-bar";
import { isFactor } from "@/lib/fitness-factors";
import { useFamilyProfiles, useFitnessMap, useLatestFitnessTest } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";

/** 측정 결과 — 부모 화면이다(레이아웃이 아이를 돌려보낸다). */
export default function ResultPage() {
  const { profileId } = useParams<{ profileId: string }>();
  // 첫 시작 → 측정 → 결과는 전부 바꿔치기다. 뒤로는 홈으로(앱을 나가지 않게)
  const nav = useSearchParams().get("from") === "start" ? { backHref: "/parent" } : { back: true };
  const { familyId } = useSession();
  // 가족 전체에서 찾는다. `/me` 는 이 계정이 관리하는 프로필만이라 자녀가 자기 계정을 가지면 거기서 빠진다
  const { data: family } = useFamilyProfiles(familyId);
  const { data: map } = useFitnessMap(familyId);
  const member = map?.members?.find((m) => m.profileId === profileId);
  const profile = family?.profiles?.find((p) => p.profileId === profileId);

  const { data: test, isPending, error, refetch, isRefetching } = useLatestFitnessTest(profileId);

  if (isPending) return <ResultSkeleton />;

  if (error) {
    return (
      <>
        <PageHeader title="측정 결과" {...nav} />
        <Screen>
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />
        </Screen>
      </>
    );
  }

  // 만 4세 미만은 잴 수 없다 — 측정 단추를 끄지 않고 없앤다(규칙 4)
  const measurable = (profile ?? member)?.measurable !== false;

  // 이력이 없어도 404 가 아니다. fitnessTestId 가 null 로 온다
  if (!test || test.fitnessTestId == null) {
    return (
      <>
        <PageHeader title="측정 결과" {...nav} />
        <Screen>
          <EmptyState
            scene="no-record"
            title="아직 재지 않았어요"
            action={
              measurable && (
                <Link
                  href={`/p/${profileId}/measure`}
                  className="press bg-signal-strong text-body mt-1 rounded-xl px-5 py-3 font-bold text-white"
                >
                  첫 측정 하기
                </Link>
              )
            }
          />
        </Screen>
      </>
    );
  }

  const items = test.items ?? [];
  const radar = test.radar ?? [];
  const strongest = test.strongest;
  const weakest = test.weakest;
  // 항목 하나만 쟀으면 강한 영역과 약한 영역이 같은 것으로 온다
  const onlyOneFactor = Boolean(strongest && weakest && strongest.factor === weakest.factor);

  return (
    <>
      <PageHeader
        title={profile ? `${profile.name} 결과` : "측정 결과"}
        {...nav}
        meta={
          <>
            {test.testedOn && <span>{formatDate(test.testedOn)} 측정</span>}
            <span className="text-faint">{items.length}개 항목</span>
          </>
        }
      />

      <Stage wide className="space-y-3">
        {/* 육각형은 부모 화면에만. 안쪽으로 들어간 꼭지점이 곧 약한 요인이다(규칙 10) */}
        {radar.length > 0 && (
          <section className="card-hero">
            <CardHead title="요인별 모양" />
            {/* 육각형 · 그 아래 통합 신체 점수(9/25) — 점수는 가족 체력 지도가 준 이 회차의 또래 백분위 */}
            <FactorView
              points={radar}
              name={profile?.name ?? "나"}
              pending={false}
              score={member?.latest?.overallPercentile ?? null}
            />
          </section>
        )}

        {/* 잘하는 것을 먼저 말한다 */}
        {(strongest || weakest) && (
          <section className="card divide-rows py-1">
            <FactorLine
              label={onlyOneFactor ? "지금 재 본 영역" : "잘하고 있는 영역"}
              factor={strongest?.factor}
            />
            {!onlyOneFactor && weakest && (
              <FactorLine label="지금 키우기 좋은 영역" factor={weakest.factor} />
            )}
          </section>
        )}

        <section className="card">
          {/* 막대 가운데 눈금이 무엇인지 글로 — 요인 표와 같은 말. 몇 항목인지는 머리에 있다 */}
          <CardHead title="항목별" meta="국민체력100 등급 · 또래 평균 50" />
          <div className="divide-rows">
            {items.map((entry, index) => (
              <div key={entry.itemCode} className="py-3.5">
                <RecordRow
                  label={entry.itemLabel ?? entry.itemCode ?? ""}
                  value={`${entry.value}${entry.unit ?? ""}`}
                  percentile={entry.percentile}
                  caption={entry.topPercentText}
                  delay={index * 0.08}
                />
                {/* 등급 · 상태 — 딱지 대신 글자 한 줄 */}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5">
                  <GradeBadge grade={entry.grade} />
                  {entry.band && (
                    <span aria-hidden className="text-faint text-xs">
                      ·
                    </span>
                  )}
                  <BandChip band={entry.band} />
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 다음에 뭘 할지 */}
        <Link
          href="/plan"
          className="press bg-signal-strong flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
        >
          <ArtIcon name="icon/menu-ai" className="size-5" />
          AI에게 운동 받기
        </Link>
        <ul className="card divide-rows py-1">
          <ListRow
            href={`/p/${profileId}/future`}
            art="icon/menu-future"
            title="10년 위 연령대 보기"
          />
          {measurable && (
            <ListRow href={`/p/${profileId}/measure`} art="icon/menu-measure" title="새로 재기" />
          )}
        </ul>
      </Stage>
    </>
  );
}

function ResultSkeleton() {
  return (
    <>
      <PageHeader title="측정 결과" back />
      <Screen className="space-y-8">
        <div className="flex justify-center">
          <Skeleton className="size-60 rounded-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-13 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </Screen>
    </>
  );
}

/** 한 요인 한 줄 — 요인 그림과 이름. 육각형 밖의 요인(협응력 · 평형성)은 그림이 없어 자리만 둔다 */
function FactorLine({ label, factor }: { label: string; factor: string | undefined }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center">
        {isFactor(factor) && <FactorIcon factor={factor} className="size-8" />}
      </span>
      <div className="min-w-0">
        <p className="text-caption text-ink-soft font-bold">{label}</p>
        <p className="text-body font-extrabold">{factor ?? "-"}</p>
      </div>
    </div>
  );
}
