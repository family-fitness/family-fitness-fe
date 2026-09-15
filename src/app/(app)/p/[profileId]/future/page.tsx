"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TrajectoryChart } from "@/components/domain/trajectory-chart";
import { ApiError } from "@/lib/api/client";
import type { PredictionResult } from "@/lib/api/types";
import {
  useCreatePrediction,
  useFamilyProfiles,
  useFitnessItems,
  useLatestFitnessTest,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";

/**
 * 10년 뒤 — **예언이 아니다.**
 *
 * 국민체력100은 횡단면 조사다. 같은 사람을 10년 따라간 자료가 아니라
 * 지금 10년 위 연령대가 어디 있는지를 본 것이다. 그래서 이 화면은
 * "당신은 10년 뒤 이렇게 됩니다" 라고 말하지 않는다.
 *
 * 서버가 준 `notice` 는 **제거하거나 접을 수 없다.** 항상 보이게 둔다.
 * p10~p90 음영을 반드시 같이 그린다 — 중앙값만 그리면 확정된 미래처럼 보인다.
 *
 * 시나리오는 MAINTAIN 하나뿐이다. 횡단면 자료라 "더 노력하면" 을 낼 근거가 없다.
 */
export default function FuturePage() {
  const router = useRouter();
  const { profileId } = useParams<{ profileId: string }>();
  const { familyId } = useSession();
  // 가족 전체에서 찾는다 — 연령대를 알아야 항목 이름과 단위를 붙일 수 있다
  const { data: family } = useFamilyProfiles(familyId);
  const profile = family?.profiles?.find((p) => p.profileId === profileId);

  const { data: latest, isPending: latestPending } = useLatestFitnessTest(profileId);
  // 예측 응답에는 항목 코드만 있다. "50" 만 있으면 무슨 수치인지 알 수 없다
  const { data: items } = useFitnessItems(profile?.ageGroup);
  const create = useCreatePrediction(profileId);

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasTest = Boolean(latest?.fitnessTestId);

  // 조회 엔드포인트가 없다. 들어오면 한 번 만든다
  useEffect(() => {
    if (!hasTest || result || create.isPending) return;
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

  if (!hasTest) {
    return (
      <>
        <PageHeader eyebrow="FUTURE" title="10년 뒤" back />
        <Screen>
          <EmptyState
            scene="first-measure"
            title="측정을 먼저 해 주세요"
            description="지금 어디에 있는지를 알아야 10년 위 연령대가 어디 있는지 견줄 수 있어요."
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
        eyebrow="FUTURE"
        title={profile ? `${profile.name}의 10년 뒤` : "10년 뒤"}
        back
        meta={<span className="text-faint">국민체력100 집단 분포</span>}
      />

      <Screen className="space-y-6">
        {/* 무엇을 보는 그림인지 먼저 말한다. 그림부터 보면 예언으로 읽힌다 */}
        <div>
          <p className="text-[0.95rem] leading-relaxed font-bold">
            지금과 같은 조건의 10년 위 연령대는 여기 있습니다.
          </p>
          {item && (
            <p className="text-ink-soft mt-1 text-sm">{item.itemLabel ?? item.itemName} 기준</p>
          )}
        </div>

        {create.isPending && !result && <Skeleton className="h-50 w-full rounded-xl" />}

        {result && points.length > 0 && (
          <>
            <TrajectoryChart points={points} unit={unit} />

            {first && last && (
              <dl className="divide-rows">
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
                    <span className="text-faint block text-[0.7rem]">
                      열에 여덟은 {last.p10}~{last.p90}
                      {unit}
                    </span>
                  </dd>
                </div>
              </dl>
            )}

            {/* 서버가 준 고지. 접거나 줄이지 않는다 */}
            {result.notice && (
              <p className="border-line text-ink-soft rounded-xl border p-4 text-[0.78rem] leading-relaxed">
                {result.notice}
              </p>
            )}

            <p className="text-faint text-[0.7rem] leading-relaxed">
              국민체력100은 여러 사람을 한 시점에 조사한 자료예요. 한 사람을 10년 동안 따라간 기록이
              아니라서, 개인이 앞으로 어떻게 변할지는 알 수 없어요.
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
      </Screen>
    </>
  );
}

function predictMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
  switch (error.code) {
    case "NO_FITNESS_TEST":
      return "측정 기록이 있어야 볼 수 있어요.";
    case "CONSENT_REQUIRED":
      return "보호자 동의가 필요해요. 설정에서 확인해 주세요.";
    case "TEMPORARILY_UNAVAILABLE":
      return "지금은 계산할 수 없어요. 잠시 후 다시 시도해 주세요.";
    default:
      return error.userMessage;
  }
}

function FutureSkeleton() {
  return (
    <>
      <PageHeader eyebrow="FUTURE" title="10년 뒤" back />
      <Screen className="space-y-6">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-50 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </Screen>
    </>
  );
}
