"use client";

import { Avatar } from "@/components/ui/illustration";
import type { ProfileSummary } from "@/lib/api/types";
import { avatarFor } from "@/lib/avatar";

/**
 * 한 사람을 한 줄로 요약하는 머리 띠.
 *
 * 전적 검색 사이트들이 공통으로 쓰는 모양이다 — 누구인지, 지금 몇인지,
 * 기준 대비 어디인지를 첫 화면 한 줄에 몰아 둔다. 그 아래로는 근거가 이어진다.
 * 우리도 점수 하나를 크게 띄우고 나머지를 밑에 세운다.
 */
export function StatStrip({
  profile,
  score,
  meta,
}: {
  profile: Pick<ProfileSummary, "profileId" | "name" | "ageGroup">;
  /** 0~100 또래 백분위 */
  score: number | null;
  /** 마지막 측정일 같은 부가 정보 */
  meta?: string;
}) {
  const gap = score == null ? null : score - 50;

  return (
    <section className="border-line flex items-center gap-3 rounded-2xl border p-3.5">
      <Avatar parts={avatarFor(profile)} size={52} className="shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="text-body truncate font-extrabold">{profile.name}</p>
        <p className="text-faint text-caption truncate">
          {profile.ageGroup}
          {meta && ` · ${meta}`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {score == null ? (
          <span className="text-faint text-caption font-bold">아직 안 쟀어요</span>
        ) : (
          <>
            <span className="board-num text-signal-deep block text-3xl leading-none">{score}</span>
            {/* 또래와의 차이에 색을 칠하지 않는다. 초록·빨강으로 나누면
                부모 화면이 아이를 채점하는 표가 된다 (도메인 규칙 8) */}
            <span className="text-ink-soft text-caption mt-0.5 block font-bold tabular-nums">
              또래 {gap != null && gap >= 0 ? `+${gap}` : gap}
            </span>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * 요인 하나를 한 줄로. 왼쪽에 이름, 가운데 막대, 오른쪽에 숫자.
 *
 * 레이더는 모양은 예쁘지만 "근력이 몇인지" 를 읽을 수 없다.
 * 부모가 알고 싶은 건 모양이 아니라 값이라 표처럼 세운다.
 */
export function FactorRow({
  factor,
  percentile,
}: {
  factor: string;
  percentile: number | null | undefined;
}) {
  // 규준이 없는 항목은 0% 막대를 그리지 않는다. 꼴찌처럼 보인다
  if (percentile == null) {
    return (
      <div className="flex items-center gap-3 py-2.5">
        <span className="w-16 shrink-0 text-sm font-bold">{factor}</span>
        <span className="text-faint text-caption flex-1">아직 기준이 없어요</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-16 shrink-0 text-sm font-bold">{factor}</span>

      <span className="bg-sub relative h-2 min-w-0 flex-1 overflow-hidden rounded-full">
        <span
          className="bg-signal absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${percentile}%` }}
        />
        {/* 또래 평균 눈금. 기준선이 없으면 62 가 좋은 건지 알 수 없다 */}
        <span className="bg-ink-soft absolute inset-y-[-3px] left-1/2 w-px" aria-hidden />
      </span>

      <span className="board-num w-9 shrink-0 text-right text-base leading-none">{percentile}</span>
    </div>
  );
}
