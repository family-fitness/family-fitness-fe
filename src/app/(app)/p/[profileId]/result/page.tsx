"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { CardHead } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { BandChip, GradeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorIcon } from "@/components/domain/factor-icon";
import { FactorView } from "@/components/domain/body-card";
import { RecordRow } from "@/components/domain/record-bar";
import { isFactor } from "@/lib/fitness-factors";
import { useFamilyProfiles, useLatestFitnessTest } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useIsKidView } from "@/lib/view-role";
import { formatDate } from "@/lib/utils";

/** 측정 결과. */
export default function ResultPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { familyId } = useSession();
  // 부모 폰을 아이가 쓰는 동안에도 서열은 감춘다
  const kidView = useIsKidView();
  // 가족 전체에서 찾는다. useSession().profiles 는 이 계정이 관리하는 프로필만이라
  // 자녀가 자기 계정을 가지면 거기서 빠진다
  const { data: family } = useFamilyProfiles(familyId);
  const profile = family?.profiles?.find((p) => p.profileId === profileId);

  const { data: test, isPending, error, refetch, isRefetching } = useLatestFitnessTest(profileId);

  if (isPending) return <ResultSkeleton />;

  if (error) {
    return (
      <>
        <PageHeader title="측정 결과" back />
        <Screen>
          <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />
        </Screen>
      </>
    );
  }

  // 이력이 없어도 404 가 아니다. fitnessTestId 가 null 로 온다
  if (!test || test.fitnessTestId == null) {
    return (
      <>
        <PageHeader title="측정 결과" back />
        <Screen>
          <EmptyState
            scene="no-record"
            title="아직 기록이 없어요"
            action={
              <Link
                href={`/p/${profileId}/measure`}
                className="press bg-signal-strong text-body mt-1 rounded-xl px-5 py-3 font-bold text-white"
              >
                측정 입력하기
              </Link>
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
        back
        meta={
          <>
            {test.testedOn && <span>{formatDate(test.testedOn)} 측정</span>}
            <span className="text-faint">{items.length}개 항목</span>
          </>
        }
      />

      <Stage wide className="space-y-3">
        {/* 육각형은 부모 화면에만. 안쪽으로 들어간 꼭지점이 곧 약한 요인이다(규칙 10) */}
        {!kidView && radar.length > 0 && (
          <section className="card-hero">
            <CardHead title="요인별 모양" />
            <FactorView points={radar} name={profile?.name ?? "나"} pending={false} />
          </section>
        )}

        {/** 잘하는 것을 먼저 말한다. 약한 것부터 들이밀면 아이가 화면을 닫는다. */}
        {(strongest || weakest) && (
          <section className="card divide-rows py-1">
            <FactorLine
              label={onlyOneFactor ? "지금 재 본 영역" : "잘하고 있는 영역"}
              factor={strongest?.factor}
            />
            {/* 약한 요인은 아이에게 말하지 않는다 */}
            {!onlyOneFactor && weakest && !kidView && (
              <FactorLine label="지금 키우기 좋은 영역" factor={weakest.factor} />
            )}
          </section>
        )}

        <section className="card">
          <CardHead title="항목별" meta={`${items.length}개`} />
          <div className="divide-rows">
            {items.map((entry, index) => (
              <div key={entry.itemCode} className="py-3.5">
                <RecordRow
                  label={entry.itemLabel ?? entry.itemCode ?? ""}
                  value={`${entry.value}${entry.unit ?? ""}`}
                  percentile={entry.percentile}
                  /* 서준에게 백분위 표를 보여주면 그걸로 끝이다 — 아이에겐 상태만 */
                  caption={kidView ? undefined : entry.topPercentText}
                  delay={index * 0.08}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {/* 자녀 화면에서는 서열(등급) 대신 상태(band) 만 보여준다 */}
                  {!kidView && <GradeBadge grade={entry.grade} />}
                  <BandChip band={entry.band} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 다음에 뭘 할지. 서버가 정한 방향을 그대로 따른다.
            제안 · 미션 · 보호자는 부모의 말이라 아이 화면에서는 통째로 뺀다 */}
        {kidView ? (
          <Link href="/kid" className="card press bg-signal-soft block">
            <p className="text-signal-deep mt-1 text-sm font-bold">오늘 운동 하러 가기</p>
          </Link>
        ) : (
          <>
            <Link href="/plan" className="card press bg-signal-soft block">
              <p className="text-signal-deep text-sm font-extrabold">AI 에게 운동 받기</p>
            </Link>
            <ul className="card divide-rows py-1">
              <ListRow
                href={`/p/${profileId}/future`}
                art="icon/menu-future"
                title="10년 위 연령대 보기"
                description="지금과 같은 조건의 10년 위 연령대"
              />
              <ListRow href={`/p/${profileId}/measure`} art="icon/menu-measure" title="다시 재기" />
            </ul>
          </>
        )}

        {/* 서버가 준 고지 문구. 줄이거나 접지 않는다 */}
        {test.disclaimer && (
          <p className="text-caption text-ink-soft px-1 leading-relaxed">{test.disclaimer}</p>
        )}
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

/** 한 요인 한 줄 — 요인 아이콘과 이름 */
function FactorLine({ label, factor }: { label: string; factor: string | undefined }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className="bg-signal-soft text-signal-strong grid size-10 shrink-0 place-items-center rounded-xl"
      >
        {isFactor(factor) ? (
          <FactorIcon factor={factor} className="size-6" />
        ) : (
          <Activity className="size-5" strokeWidth={2.1} />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-caption text-ink-soft font-bold">{label}</p>
        <p className="text-body font-extrabold">{factor ?? "-"}</p>
      </div>
    </div>
  );
}
