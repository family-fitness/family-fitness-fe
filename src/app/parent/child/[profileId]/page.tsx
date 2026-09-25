"use client";

import { ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorView } from "@/components/domain/factor-view";
import { MonthStats, RecentDays } from "@/components/domain/child-stats";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { GrowthPole } from "@/components/scene/growth-pole";
import { AchievementGrid } from "@/components/domain/achievement-grid";
import { FactorTable } from "@/components/domain/factor-table";
import { IslandCard } from "@/components/domain/island-card";
import { ScoreTrend } from "@/components/domain/score-trend";
import { REMEASURE_DAYS } from "@/lib/remeasure";
import type { FitnessTestSummary } from "@/lib/api/types";
import {
  useFamilyProfiles,
  useFitnessItems,
  useFitnessMap,
  useFitnessTests,
  useLatestFitnessTest,
  useProgress,
} from "@/lib/api/queries";
import { stageOf } from "@/lib/levels";
import { useSession } from "@/lib/session";
import { daysSince } from "@/lib/today";
import { useBodyStore } from "@/stores/body-store";
import { formatDate, withJosa } from "@/lib/utils";
import { ArtIcon } from "@/components/ui/art-icon";

/**
 * 아이 기록 — 전적 검색 사이트(op.gg · maple.gg)처럼 한 아이의 통계를 한 화면에.
 *
 * 맨 위 프로필 머리(레벨 캐릭터 · 이름 · 서버가 준 한 줄)와 신체 점수 · 육각형,
 * 그 아래 이번 달 칸 넷 · 최근 기록(날마다 한 줄) · 요인 표 · 점수 흐름 · 키와 몸무게 순이다.
 * 육각형 아래 요인 표가 그래프의 표 쌍둥이다. **부모 화면에만** 있다(규칙 10).
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
  const { data: history } = useFitnessTests(profileId);
  const {
    data: progress,
    isPending: progressPending,
    error: progressError,
  } = useProgress(profileId);
  const localBody = useBodyStore((s) => s.byProfile[profileId]);

  const profile = family?.profiles?.find((p) => p.profileId === profileId);
  const member = map?.members?.find((m) => m.profileId === profileId);
  const { data: catalog } = useFitnessItems(profile?.ageGroup);

  if (isPending || latestPending) {
    return (
      <>
        <AppBar back title="아이 기록" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-112 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
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
        <AppBar back title="아이 기록" />
        <Stage>
          <ErrorState error={failure} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <AppBar back title="아이 기록" />
        <Stage>
          <EmptyState scene="no-record" title="찾을 수 없는 프로필이에요" />
        </Stage>
      </>
    );
  }

  const name = profile.name ?? "아이";
  const score = member?.latest?.overallPercentile ?? null;
  const tests = history?.tests ?? [];
  const stage = stageOf(progress?.level);

  return (
    <>
      <AppBar back title="아이 기록" />
      <Stage wide className="space-y-3">
        <Card hero>
          {/* 프로필 머리 — 캐릭터 · 이름 · 레벨 · 서버가 준 한 줄 그대로(규칙 9) */}
          <div className="flex items-center gap-4">
            <span className="bg-signal-soft grid size-20 shrink-0 place-items-center rounded-3xl">
              <LevelBuddy stage={stage.stage} size={68} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lead font-extrabold">{name}</h2>
              <p className="text-caption text-ink-soft mt-0.5 font-bold">
                {progress ? `Lv.${progress.level} · ${stage.name}` : " "}
              </p>
              {member?.headline && (
                <p className="text-signal-deep text-caption mt-1 font-extrabold">
                  {member.headline}
                </p>
              )}
            </div>
          </div>
          <div className="border-line mt-4 border-t pt-3">
            <p className="text-caption text-ink-soft font-bold">
              체력{latest?.testedOn && ` · ${formatDate(latest.testedOn)} 측정`}
            </p>
            {score == null && <p className="text-lead mt-2 font-extrabold">아직 재지 않았어요</p>}
          </div>
          {/* 육각형 · 그 아래 통합 신체 점수(9/25) · 출처 */}
          <FactorView points={latest?.radar} name={name} pending={false} score={score} />
        </Card>

        <MonthStats
          familyId={familyId ?? undefined}
          profileId={profileId}
          streak={progress?.streakDays}
          streakState={progressError ? "error" : progressPending ? "pending" : "ready"}
        />
        <RecentDays familyId={familyId ?? undefined} profileId={profileId} />

        <Card>
          <CardHead title="요인별" meta="또래 평균 50" />
          <FactorTable radar={latest?.radar} results={latest?.items} catalog={catalog?.items} />
        </Card>

        {tests.length > 0 && (
          <Card>
            <CardHead title="신체 점수 흐름" meta={`${tests.length}번 쟀어요`} />
            <ScoreTrend tests={tests} />
          </Card>
        )}

        <BodyGrowth
          profileId={profileId}
          name={name}
          tests={tests}
          fallback={
            latest?.heightCm && latest?.weightKg && latest?.testedOn
              ? {
                  heightCm: latest.heightCm,
                  weightKg: latest.weightKg,
                  measuredOn: latest.testedOn,
                }
              : localBody
          }
          lastTestedOn={latest?.testedOn}
        />

        {/* 아이 화면의 섬을 부모도 본다. 해낸 날이 쌓이는 곳 */}
        <IslandCard profileId={profileId} name={name} />

        {/* 어떤 업적이 있는지 — 받은 것 · 아직인 것과 얻는 법(9/25 「어떤 업적이 있는지도 보이는 장소」) */}
        {progress && progress.achievements.length > 0 && (
          <Card>
            <CardHead
              title="업적"
              meta={`${progress.achievements.filter((a) => a.earnedAt).length} / ${progress.achievements.length}`}
            />
            <div className="mt-2">
              <AchievementGrid achievements={progress.achievements} />
            </div>
          </Card>
        )}

        <Card href={`/p/${profileId}/future`} label="10년 위 연령대 보기">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="bg-signal-soft text-signal-strong grid size-11 shrink-0 place-items-center rounded-2xl"
            >
              <ArtIcon name="icon/menu-future" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">10년 위 연령대는 어디쯤일까</p>
            </div>
            <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
          </div>
        </Card>
      </Stage>
    </>
  );
}

/**
 * 키 · 몸무게. 마지막 값과, 처음 잰 때보다 얼마나 자랐는지.
 *
 * 서버가 이력을 주면 이력으로, 아직이면 최근 회차나 기기에 둔 값으로.
 * 다시 재기는 덮어쓰기가 아니라 추가다 — 지난 값이 남아야 자란 걸 보여 준다(규칙 11).
 */
function BodyGrowth({
  profileId,
  name,
  tests,
  fallback,
  lastTestedOn,
}: {
  profileId: string;
  name: string;
  tests: FitnessTestSummary[];
  fallback: { heightCm: number; weightKg: number; measuredOn: string } | undefined;
  lastTestedOn: string | null | undefined;
}) {
  const withBody = tests
    .filter((t) => t.heightCm != null && t.weightKg != null)
    .sort((a, b) => a.testedOn.localeCompare(b.testedOn));
  const first = withBody[0];
  const now = withBody[withBody.length - 1];
  const height = now?.heightCm ?? fallback?.heightCm ?? null;
  const weight = now?.weightKg ?? fallback?.weightKg ?? null;
  const measuredOn = now?.testedOn ?? fallback?.measuredOn ?? null;
  const grew =
    first && now && first !== now && first.heightCm != null && now.heightCm != null
      ? Math.round((now.heightCm - first.heightCm) * 10) / 10
      : null;
  const due = (daysSince(lastTestedOn) ?? 0) >= REMEASURE_DAYS;
  const { data: progress } = useProgress(profileId);
  // 잰 키를 오래된 것부터. 이력이 아직 없으면 기기에 적어 둔 한 번이라도
  const records = withBody.length
    ? withBody.map((t) => ({ date: t.testedOn, heightCm: t.heightCm as number }))
    : fallback
      ? [{ date: fallback.measuredOn, heightCm: fallback.heightCm }]
      : [];

  return (
    <Card>
      <CardHead
        title="키 · 몸무게"
        meta={measuredOn ? `${formatDate(measuredOn)} 기준` : undefined}
      />
      {height != null && weight != null ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="tile">
            <p className="metric-label">키</p>
            <p className="metric-value text-metric mt-1">
              {height}
              <span className="metric-unit">cm</span>
            </p>
          </div>
          <div className="tile">
            <p className="metric-label">몸무게</p>
            <p className="metric-value text-metric mt-1">
              {weight}
              <span className="metric-unit">kg</span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-ink-soft mt-1 text-sm">아직 안 적었어요</p>
      )}
      {records.length > 0 && (
        <GrowthPole records={records} stage={stageOf(progress?.level).stage} className="mt-2" />
      )}
      {grew != null && grew > 0 && first && (
        <p className="text-caption text-ink-soft mt-2.5 font-semibold">
          {formatDate(first.testedOn)}보다 <b className="text-ink">{grew}cm</b> 자랐어요
        </p>
      )}
      <NavLink
        href={`/p/${profileId}/measure`}
        className={
          due
            ? "press bg-signal-strong mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
            : "press bg-sub text-ink mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
        }
      >
        <ArtIcon name="icon/menu-measure" className="size-5" />
        {withJosa(name, "을를")} 새로 재기
      </NavLink>
    </Card>
  );
}
