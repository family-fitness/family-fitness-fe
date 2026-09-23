"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TrajectoryChart } from "@/components/domain/trajectory-chart";
import { errorMessage } from "@/lib/errors";
import type { PredictionResult } from "@/lib/api/types";
import {
  useCreatePrediction,
  useFamilyProfiles,
  useFitnessItems,
  useLatestFitnessTest,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";

/** 10년 뒤 — **예언이 아니다.** */
export default function FuturePage() {
  const router = useRouter();
  const { profileId } = useParams<{ profileId: string }>();
  const { familyId } = useSession();
  // 가족 전체에서 찾는다 — 연령대를 알아야 항목 이름과 단위를 붙일 수 있다
  const { data: family } = useFamilyProfiles(familyId);
  const profile = family?.profiles?.find((p) => p.profileId === profileId);

  const {
    data: latest,
    isPending: latestPending,
    error: latestError,
    refetch,
  } = useLatestFitnessTest(profileId);
  // 예측 응답에는 항목 코드만 있다. "50" 만 있으면 무슨 수치인지 알 수 없다
  const { data: items } = useFitnessItems(profile?.ageGroup);
  const create = useCreatePrediction(profileId);

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasTest = Boolean(latest?.fitnessTestId);

  /** 조회 엔드포인트가 없어서 들어오면 만든다(POST). **한 번만 만들어야 한다.** */
  const requested = useRef(false);
  useEffect(() => {
    if (!hasTest || requested.current) return;
    requested.current = true;
    let cancelled = false;
    create
      .mutateAsync({})
      .then((r) => !cancelled && setResult(r))
      .catch((e) => !cancelled && setError(predictMessage(e)));
    return () => {
      cancelled = true;
    };
    // create 는 매 렌더 새 객체다. 측정 유무가 바뀔 때만 다시 시도한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTest]);

  if (latestPending) return <FutureSkeleton />;

  // 불러오지 못한 것과 아직 안 잰 것은 다르다. 섞으면 서버가 죽었을 때
  // 이미 잰 사람에게 "측정을 먼저 해 주세요" 라고 말하게 된다
  if (latestError) {
    return (
      <>
        <PageHeader title="10년 뒤" back />
        <Screen>
          <ErrorState error={latestError} onRetry={() => void refetch()} />
        </Screen>
      </>
    );
  }

  if (!hasTest) {
    return (
      <>
        <PageHeader title="10년 뒤" back />
        <Screen>
          <EmptyState
            scene="first-measure"
            title="측정을 먼저 해 주세요"
            action={
              <Button size="md" onClick={() => router.push(`/p/${profileId}/measure`)}>
                측정 입력하기
              </Button>
            }
          />
        </Screen>
      </>
    );
  }

  const points = result?.points ?? [];
  const first = points.find((p) => p.yearsFromNow === 0);
  const last = [...points].sort((a, b) => (b.yearsFromNow ?? 0) - (a.yearsFromNow ?? 0))[0];

  const item = items?.items?.find((i) => i.itemCode === points[0]?.itemCode);
  const unit = item?.unit ?? "";

  return (
    <>
      <PageHeader
        title={profile ? `${profile.name}의 10년 뒤` : "10년 뒤"}
        back
        meta={<span className="text-faint">국민체력100 집단 분포</span>}
      />

      <Stage wide className="space-y-3">
        <section className="card-hero">
          {/* 무엇을 보는 그림인지 먼저 말한다. 그림부터 보면 예언으로 읽힌다 */}
          <p className="text-body leading-relaxed font-extrabold">
            지금과 같은 조건의 10년 위 연령대는 여기 있습니다.
          </p>
          {item && (
            <p className="text-caption text-ink-soft mt-1">
              {item.itemLabel ?? item.itemName} 기준
            </p>
          )}

          {create.isPending && !result && <Skeleton className="mt-4 h-50 w-full rounded-xl" />}
          {result && points.length > 0 && (
            <div className="mt-3">
              <TrajectoryChart points={points} unit={unit} />
            </div>
          )}
        </section>

        {result && points.length > 0 && (
          <>
            {first && last && (
              <dl className="card divide-rows py-1">
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-sm font-bold">지금</dt>
                  <dd className="tabular board-num text-xl">
                    {first.p50}
                    <span className="text-ink-soft ml-0.5 text-sm font-bold">{unit}</span>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-sm font-bold">{last.yearsFromNow}년 위 연령대</dt>
                  <dd className="text-right">
                    <span className="tabular board-num text-xl">
                      {last.p50}
                      <span className="text-ink-soft ml-0.5 text-sm font-bold">{unit}</span>
                    </span>
                    <span className="text-faint text-caption block">
                      열에 여덟은 {last.p10}~{last.p90}
                      {unit}
                    </span>
                  </dd>
                </div>
              </dl>
            )}

            {/*
              고지는 한 번만 한다. 서버가 준 문구가 있으면 그걸 쓰고(도메인 규칙 9),
              없을 때만 우리 문장을 낸다 — 둘 다 내면 같은 말이 두 번 쌓이고,
              두 번 읽히는 경고는 한 번도 안 읽힌다.
            */}
            <p className="card text-ink-soft text-caption leading-relaxed">
              {result.notice ??
                "국민체력100은 여러 사람을 한 시점에 조사한 자료예요. 한 사람을 10년 동안 따라간 기록이 아니라서, 개인이 앞으로 어떻게 변할지는 알 수 없어요."}
            </p>
          </>
        )}

        {error && (
          <div className="space-y-3">
            <p
              role="alert"
              className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
            >
              {error}
            </p>
            <Button
              size="block"
              variant="outline"
              loading={create.isPending}
              onClick={() => {
                setError(null);
                create
                  .mutateAsync({})
                  .then(setResult)
                  .catch((e) => setError(predictMessage(e)));
              }}
            >
              다시 시도
            </Button>
          </div>
        )}
      </Stage>
    </>
  );
}

const predictMessage = (error: unknown) =>
  errorMessage(
    error,
    {
      NO_FITNESS_TEST: "측정 기록이 있어야 볼 수 있어요.",
      CONSENT_REQUIRED: "보호자 동의가 필요해요. 설정에서 확인해 주세요.",
      TEMPORARILY_UNAVAILABLE: "지금은 계산할 수 없어요. 잠시 후 다시 시도해 주세요.",
    },
    "불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  );

function FutureSkeleton() {
  return (
    <>
      <PageHeader title="10년 뒤" back />
      <Screen className="space-y-6">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-50 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </Screen>
    </>
  );
}
