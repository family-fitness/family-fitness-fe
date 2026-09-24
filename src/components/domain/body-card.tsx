"use client";

import Link from "next/link";

import { Card, CardHead } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorRadar } from "@/components/domain/factor-radar";
import type { FitnessMapMember } from "@/lib/api/types";
import { useLatestFitnessTest } from "@/lib/api/queries";
import { formatDate } from "@/lib/utils";

/**
 * 부모 홈의 주인공 — 「우리 아이가 이 정도다」.
 *
 * 회의에서 부모는 그래프 **하나**를 보고 싶어 한다고 정했다. 신체 점수 하나와
 * 체력 육각형 하나. 점수는 서버의 `overallPercentile` 이고(규칙 10), 옆에 늘
 * 또래 평균 50 을 같이 적는다 — 기준이 없으면 62가 좋은지 모른다.
 */
export function BodyCard({ child }: { child: FitnessMapMember }) {
  const { data: latest, isPending } = useLatestFitnessTest(child.profileId);
  const name = child.name ?? "아이";
  const score = child.latest?.overallPercentile ?? null;
  const testedOn = child.latest?.testedOn ?? latest?.testedOn ?? null;
  const detail = `/parent/child/${child.profileId}`;

  return (
    <Card hero>
      <CardHead
        title={`${name}의 체력`}
        meta={testedOn ? `${formatDate(testedOn)} 측정` : undefined}
        href={detail}
      />

      {score == null ? <FirstMeasure child={child} /> : <ScoreLine score={score} />}

      <FactorView
        points={latest?.radar}
        name={name}
        pending={isPending}
        ageGroup={child.ageGroup}
      />

      {/* 서버가 준 한 줄을 그대로(규칙 9). 회색 칸에 담으면 누르는 칸처럼 보여 글 한 줄로 둔다 */}
      {child.headline && (
        <p className="mt-3 flex justify-center">
          <span className="text-signal-deep text-body font-extrabold">{child.headline}</span>
        </p>
      )}
    </Card>
  );
}

/**
 * 신체 점수 한 줄. 숫자 · 또래 평균 · 그 사이를 잇는 막대.
 *
 * 막대의 가운데 눈금이 50 이다. 숫자만 크게 두면 62 가 좋은 건지 모른다.
 */
export function ScoreLine({ score }: { score: number }) {
  return (
    <div className="mt-3">
      <div className="flex items-end justify-between gap-3">
        <p className="metric-value text-metric-lg">
          {score}
          <span className="metric-unit">점</span>
        </p>
        <p className="text-caption text-ink-soft pb-1 text-right font-semibold">
          신체 점수 · 또래 평균 <b className="text-ink">50</b>
        </p>
      </div>
      <div
        className="record-rail mt-2.5"
        role="img"
        aria-label={`신체 점수 ${score}. 또래 평균은 50`}
      >
        <span className="record-fill" style={{ width: `${score}%` }} />
        <span className="record-avg" />
      </div>
    </div>
  );
}

/** 아직 한 번도 안 쟀다. 0점으로 그리지 않는다(규칙 10) */
function FirstMeasure({ child }: { child: FitnessMapMember }) {
  return (
    <div className="mt-3">
      <p className="text-lead font-extrabold">아직 재지 않았어요</p>
      <p className="text-caption text-ink-soft mt-1">첫 측정을 등록하면 지도가 그려져요</p>
      {/* 만 4세 미만은 잴 수 없다. 버튼을 끄지 않고 없앤다(규칙 4) */}
      {child.measurable !== false && (
        <Link
          href={`/p/${child.profileId}/measure`}
          className="press bg-signal-strong mt-3 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-extrabold text-white"
        >
          첫 측정 하기
        </Link>
      )}
    </div>
  );
}

/**
 * 여섯 요인 — 체력 육각형 하나. 표(요인별)는 아이 기록에 같이 있다.
 *
 * 아래에 **무엇과 견준 값인지** 한 줄을 늘 붙인다 — 국민체력100 공공데이터의 그 연령대 또래.
 * 공공데이터 활용 공모전이라 이 서비스의 숫자가 어디서 왔는지가 화면에서 보여야 한다.
 */
export function FactorView({
  points,
  name,
  pending,
  ageGroup,
}: {
  points: Parameters<typeof FactorRadar>[0]["points"];
  name: string;
  pending: boolean;
  /** 서버가 준 연령대 — 「유소년」 */
  ageGroup?: string | null;
}) {
  return (
    <div className="mt-4">
      {pending ? (
        <Skeleton className="mx-auto aspect-[320/290] w-full rounded-3xl" />
      ) : (
        <FactorRadar points={points} name={name} />
      )}
      <p className="mt-2.5 flex justify-center">
        <span className="bg-signal-soft text-signal-deep text-micro inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-extrabold">
          <span aria-hidden className="bg-signal-deep size-1.5 rounded-full" />
          국민체력100 · {ageGroup ?? "같은 연령대"} 또래 기준
        </span>
      </p>
    </div>
  );
}
