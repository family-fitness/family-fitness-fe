"use client";

import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { FactorRadar } from "@/components/domain/factor-radar";
import type { FitnessMapMember } from "@/lib/api/types";

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
export function FirstMeasure({ child }: { child: FitnessMapMember }) {
  return (
    <div className="mt-3">
      <p className="text-lead font-extrabold">아직 재지 않았어요</p>
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
 * 육각형 **바로 아래에 통합 신체 점수**를 둔다(9/25 「육각형 아래 통합적인 신체점수」) — 여섯 꼭지점을
 * 한 수로 읽는 자리다. 점수는 서버의 `overallPercentile`(규칙 10), 옆에 늘 또래 평균 50.
 * 무엇과 견준 값인지(국민체력100 또래)는 육각형 범례가 말한다 — 둥근 딱지로 따로 달지 않는다(9/25).
 */
export function FactorView({
  points,
  name,
  pending,
  score,
  headline,
  className,
}: {
  points: Parameters<typeof FactorRadar>[0]["points"];
  name: string;
  pending: boolean;
  /** 통합 신체 점수(또래 백분위). 안 쟀으면 null — 0점으로 그리지 않는다 */
  score?: number | null;
  /** 서버가 준 한 줄(「유소년 상위 45%」) — 점수 바로 아래에 그대로(규칙 9) */
  headline?: string | null;
  className?: string;
}) {
  return (
    <div className={className ?? "mt-4"}>
      {pending ? (
        <Skeleton className="mx-auto aspect-[320/290] w-full rounded-3xl" />
      ) : (
        <FactorRadar points={points} name={name} />
      )}
      {score != null && <ScoreLine score={score} />}
      {headline && (
        <p className="text-signal-deep text-body mt-2 text-center font-extrabold">{headline}</p>
      )}
    </div>
  );
}
