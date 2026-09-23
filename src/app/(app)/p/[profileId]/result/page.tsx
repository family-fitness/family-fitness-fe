"use client";

import { LineChart, Ruler } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { BandChip, GradeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorRadar } from "@/components/domain/factor-radar";
import { RecordRow } from "@/components/domain/record-bar";
import { factorPose, itemPose } from "@/lib/fitness-items";
import { useFamilyProfiles, useLatestFitnessTest } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useIsKidView } from "@/lib/view-role";
import { formatDate, withJosa } from "@/lib/utils";

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
            description="집에서 잴 수 있는 항목부터 넣어 보세요."
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

      <Screen className="space-y-8">
        {radar.length >= 3 && <FactorRadar points={radar} name={profile?.name ?? "나"} />}

        {/** 잘하는 것을 먼저 말한다. 약한 것부터 들이밀면 아이가 화면을 닫는다. */}
        {onlyOneFactor ? (
          <section className="flex items-center gap-3">
            <Illustration name={factorPose(strongest?.factor)} size={48} />
            <div className="min-w-0">
              <p className="text-faint text-caption font-bold">지금 재 본 영역</p>
              <p className="text-body font-bold">{strongest?.factor}</p>
            </div>
          </section>
        ) : (
          (strongest || weakest) && (
            <section className="divide-rows">
              {strongest && (
                <div className="flex items-center gap-3 py-3">
                  <Illustration name={factorPose(strongest.factor)} size={48} />
                  <div className="min-w-0">
                    <p className="text-faint text-caption font-bold">잘하고 있는 영역</p>
                    <p className="text-body font-bold">{strongest.factor}</p>
                  </div>
                </div>
              )}
              {/* 약한 요인은 아이에게 말하지 않는다 */}
              {weakest && !kidView && (
                <div className="flex items-center gap-3 py-3">
                  <Illustration name={factorPose(weakest.factor)} size={48} />
                  <div className="min-w-0">
                    <p className="text-faint text-caption font-bold">지금 키우기 좋은 영역</p>
                    <p className="text-body font-bold">{weakest.factor}</p>
                  </div>
                </div>
              )}
            </section>
          )
        )}

        <section className="space-y-5">
          <div className="section-head">
            <h2>항목별</h2>
          </div>
          {items.map((entry, index) => (
            <div key={entry.itemCode} className="flex items-start gap-3">
              <Illustration
                name={itemPose({ itemCode: entry.itemCode, factor: undefined })}
                size={52}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
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
            </div>
          ))}
        </section>

        {/* 다음에 뭘 할지. 서버가 정한 방향을 그대로 따른다.
            승인·미션·보호자는 부모의 말이라 아이 화면에서는 통째로 뺀다 */}
        {kidView ? (
          <div className="bg-signal-soft rounded-2xl p-4">
            <p className="text-signal-deep text-sm font-bold">
              {onlyOneFactor
                ? "더 재 보면 더 잘 맞는 운동을 찾아 줄게"
                : test.coachDirection === "STRENGTHEN"
                  ? "잘하는 걸 더 키워 볼까"
                  : strongest
                    ? `${withJosa(strongest.factor ?? "", "이가")} 좋아지고 있어`
                    : "오늘 할 운동을 골라 볼까"}
            </p>
            <Link
              href="/kid"
              className="text-signal-strong mt-1 inline-flex min-h-11 items-center text-sm font-bold"
            >
              오늘 할 운동 고르기
            </Link>
          </div>
        ) : (
          <div className="bg-signal-soft rounded-2xl p-4">
            <p className="text-signal-deep text-sm font-bold">
              {onlyOneFactor
                ? "항목을 더 재면 더 잘 맞는 운동을 찾아요"
                : test.coachDirection === "STRENGTHEN"
                  ? "잘하는 영역을 더 키울 때예요"
                  : weakest
                    ? `${withJosa(weakest.factor ?? "", "을를")} 키우기 좋은 때예요`
                    : "이번 주 운동을 찾아볼까요"}
            </p>
            <Link
              href="/coach/weekly"
              className="text-signal-strong mt-1 inline-flex min-h-11 items-center text-sm font-bold"
            >
              이번 주 제안 보기
            </Link>
          </div>
        )}

        {!kidView && (
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/p/${profileId}/future`}
              className="press border-line flex items-center gap-2 rounded-xl border px-4 py-3.5"
            >
              <LineChart className="text-signal-strong size-4" aria-hidden />
              <span className="text-sm font-bold">10년 후 보기</span>
            </Link>
            <Link
              href={`/p/${profileId}/measure`}
              className="press border-line flex items-center gap-2 rounded-xl border px-4 py-3.5"
            >
              <Ruler className="text-signal-strong size-4" aria-hidden />
              <span className="text-sm font-bold">다시 측정</span>
            </Link>
          </div>
        )}

        {/* 서버가 준 고지 문구. 줄이거나 접지 않는다 */}
        {test.disclaimer && (
          <p className="text-faint text-caption leading-relaxed">{test.disclaimer}</p>
        )}
      </Screen>
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
