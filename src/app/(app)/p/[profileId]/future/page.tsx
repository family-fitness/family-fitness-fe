"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TrajectoryChart } from "@/components/domain/trajectory-chart";
import { errorMessage } from "@/lib/errors";
import {
  useCreatePrediction,
  useFamilyProfiles,
  useFitnessItems,
  useLatestFitnessTest,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";

/** 10년 위 연령대 — **예언이 아니다.** 같은 조건의 윗 연령대가 어디 있는지일 뿐(규칙 3) */
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
  // 결과와 실패는 요청이 들고 있는 것을 그대로 읽는다. 따로 상태에 옮기면 개발 모드에서 effect 가
  // 두 번 돌 때 첫 응답을 버리고 그래프 없이 제목만 남았다
  const result = create.data;
  const error = create.error ? predictMessage(create.error) : null;

  const hasTest = Boolean(latest?.fitnessTestId);
  const measurable = profile?.measurable !== false;

  /** 조회 엔드포인트가 없어서 들어오면 만든다(POST). **한 번만 만들어야 한다.** */
  const requested = useRef(false);
  useEffect(() => {
    if (!hasTest || requested.current) return;
    requested.current = true;
    create.mutate({});
    // create 는 매 렌더 새 객체다. 측정 유무가 바뀔 때만 다시 시도한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTest]);

  if (latestPending) return <FutureSkeleton />;

  // 불러오지 못한 것과 아직 안 잰 것은 다르다. 섞으면 서버가 죽었을 때
  // 이미 잰 사람에게 "측정을 먼저 해 주세요" 라고 말하게 된다
  if (latestError) {
    return (
      <>
        <PageHeader title="10년 위 연령대" back />
        <Screen>
          <ErrorState error={latestError} onRetry={() => void refetch()} />
        </Screen>
      </>
    );
  }

  if (!hasTest) {
    return (
      <>
        <PageHeader title="10년 위 연령대" back />
        <Screen>
          <EmptyState
            scene="no-record"
            title="아직 재지 않았어요"
            action={
              // 만 4세 미만은 잴 수 없다 — 단추를 끄지 않고 없앤다(규칙 4)
              measurable && (
                <Button size="md" onClick={() => router.push(`/p/${profileId}/measure`)}>
                  첫 측정 하기
                </Button>
              )
            }
          />
        </Screen>
      </>
    );
  }

  // 한 항목 · 지금대로(MAINTAIN)의 점만 — 여러 항목 · 여러 갈래가 섞이면 한 선에 이어 그려진다
  const code = result?.points?.[0]?.itemCode;
  const points = (result?.points ?? []).filter(
    (p) => (p.scenario ?? "MAINTAIN") === "MAINTAIN" && p.itemCode === code,
  );
  const first = points.find((p) => p.yearsFromNow === 0);
  const last = [...points].sort((a, b) => (b.yearsFromNow ?? 0) - (a.yearsFromNow ?? 0))[0];

  const item = items?.items?.find((i) => i.itemCode === points[0]?.itemCode);
  const unit = item?.unit ?? "";

  return (
    <>
      <PageHeader
        title="10년 위 연령대"
        back
        meta={<span className="text-faint">국민체력100 집단 분포</span>}
      />

      <Stage wide className="space-y-3">
        <section className="card-hero">
          {/* 무엇을 보는 그림인지가 먼저다 — 그림부터 보면 예언으로 읽힌다(규칙 3). 설명 문장이 아니라 제목 한 줄 */}
          <h2 className="text-body font-extrabold">지금과 같은 조건의 10년 위 연령대</h2>
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
                  <dt className="text-sm font-bold">지금 연령대 가운데</dt>
                  <dd className="tabular board-num text-xl">
                    {first.p50}
                    <span className="text-ink-soft ml-0.5 text-sm font-bold">{unit}</span>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between py-3">
                  <dt className="text-sm font-bold">{last.yearsFromNow}년 위 연령대 가운데</dt>
                  <dd className="text-right">
                    <span className="tabular board-num text-xl">
                      {last.p50}
                      <span className="text-ink-soft ml-0.5 text-sm font-bold">{unit}</span>
                    </span>
                    {last.p10 != null && last.p90 != null && (
                      <span className="text-faint text-caption block">
                        열에 여덟은 {last.p10}~{last.p90}
                        {unit}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}

        {error && (
          <div className="space-y-3">
            <p role="alert" className="text-signal-deep text-sm font-semibold">
              {error}
            </p>
            <Button
              size="block"
              variant="outline"
              loading={create.isPending}
              onClick={() => create.mutate({})}
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
      NO_FITNESS_TEST: "아직 재지 않았어요.",
      CONSENT_REQUIRED: "보호자 동의가 필요해요.",
      TEMPORARILY_UNAVAILABLE: "지금은 계산할 수 없어요.",
    },
    "불러오지 못했어요.",
  );

function FutureSkeleton() {
  return (
    <>
      <PageHeader title="10년 위 연령대" back />
      <Screen className="space-y-6">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-50 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </Screen>
    </>
  );
}
