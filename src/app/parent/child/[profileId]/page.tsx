"use client";

import { useParams } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorView, FirstMeasure } from "@/components/domain/factor-view";
import { MonthStats, RecentDays } from "@/components/domain/child-stats";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { AchievementGrid } from "@/components/domain/achievement-grid";
import { FactorTable } from "@/components/domain/factor-table";
import { IslandCard } from "@/components/domain/island-card";
import { GrowthRuler } from "@/components/scene/growth-ruler";
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
import { cn, formatDate, withJosa } from "@/lib/utils";
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
  const { familyId, isPending, error: sessionError, refetch: refetchMe } = useSession();

  // 꺼진 조회의 isPending 은 영영 true 다 — 가족을 기다릴 때는 isLoading 으로 본다.
  // 안 기다리면 가족이 오기 전에 「찾을 수 없는 프로필이에요」 가 번쩍 떴다
  const {
    data: family,
    isLoading: familyLoading,
    error: familyError,
    refetch: refetchFamily,
  } = useFamilyProfiles(familyId);
  const { data: map, isLoading: mapLoading } = useFitnessMap(familyId);
  const {
    data: latest,
    isPending: latestPending,
    error: latestError,
    refetch: refetchLatest,
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

  if (isPending || familyLoading || mapLoading || latestPending) {
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
  const failure =
    sessionError ?? (family ? null : familyError) ?? (latest === undefined ? latestError : null);
  if (failure) {
    return (
      <>
        <AppBar back title="아이 기록" />
        <Stage>
          <ErrorState
            error={failure}
            onRetry={() =>
              void (sessionError ? refetchMe() : !family ? refetchFamily() : refetchLatest())
            }
          />
        </Stage>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <AppBar back title="아이 기록" />
        <Stage>
          <EmptyState scene="waiting" title="찾을 수 없는 프로필이에요" />
        </Stage>
      </>
    );
  }

  const name = profile.name ?? "아이";
  const score = member?.latest?.overallPercentile ?? null;
  const testedOn = member?.latest?.testedOn ?? latest?.testedOn ?? null;
  const tests = history?.tests ?? [];
  const stage = stageOf(progress?.level);

  return (
    <>
      <AppBar back title="아이 기록" />
      <Stage wide className="space-y-3">
        <Card hero>
          {/* 프로필 머리 — 캐릭터 · 이름 · 레벨 · 서버가 준 한 줄 그대로(규칙 9) */}
          <div className="flex items-center gap-4">
            <LevelBuddy stage={stage.stage} size={80} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lead font-extrabold">{name}</h2>
              <p className="text-caption text-ink-soft mt-0.5 font-bold">
                {progress ? `Lv.${progress.level} ${stage.name}` : " "}
              </p>
              {member?.headline && (
                <p className="text-signal-deep text-caption mt-1 font-extrabold">
                  {member.headline}
                </p>
              )}
            </div>
          </div>
          {/* 측정한 적이 있는지로 가른다. 만 7~10세는 측정했어도 점수가 없을 수 있다(규칙 8).
              측정한 적이 없으면 꼭지점이 빈 육각형 대신 키움이와 첫 측정 길(부모 홈과 같은 부품) */}
          {testedOn == null ? (
            <FirstMeasure
              profileId={profileId}
              name={name}
              measurable={profile.measurable !== false}
              className="border-line mt-4 border-t"
            />
          ) : (
            <>
              <div className="border-line mt-4 border-t pt-3">
                <p className="text-caption text-ink-soft font-bold">
                  {formatDate(testedOn)}에 잰 체력
                </p>
              </div>
              {/* 육각형 · 그 아래 통합 신체 점수(9/25) · 출처 */}
              <FactorView points={latest?.radar} name={name} pending={false} score={score} />
            </>
          )}
        </Card>

        <MonthStats
          familyId={familyId ?? undefined}
          profileId={profileId}
          streak={progress?.streakDays}
          streakState={progressError ? "error" : progressPending ? "pending" : "ready"}
        />
        <RecentDays familyId={familyId ?? undefined} profileId={profileId} />

        {/* 측정한 적이 없으면 여섯 줄이 모두 「안 쟀어요」 인 표를 세우지 않는다. 위 첫 측정 길이 말한다 */}
        {testedOn != null && (
          <Card>
            {/* 견준 값이 하나도 없으면(만 7~10세) 또래 평균 눈금도 없다 */}
            <CardHead
              title="요인별"
              meta={
                (latest?.radar ?? []).some((p) => p.percentile != null) ? "또래 평균 50" : undefined
              }
            />
            <FactorTable radar={latest?.radar} results={latest?.items} catalog={catalog?.items} />
          </Card>
        )}

        {tests.length > 0 && (
          <Card>
            <CardHead title="신체 점수 흐름" meta={`${tests.length}번 쟀어요`} />
            <ScoreTrend tests={tests} />
          </Card>
        )}

        <BodyGrowth
          profileId={profileId}
          name={name}
          measurable={profile.measurable !== false}
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
      </Stage>
    </>
  );
}

/**
 * 키 · 몸무게. 마지막 값, 키 자(잰 날마다 눈금 · 키 · 몸무게 · 날짜), 잰 기록 줄.
 *
 * 서버가 이력을 주면 이력으로, 아직이면 최근 회차나 기기에 둔 값으로.
 * 다시 재기는 덮어쓰기가 아니라 추가다 — 지난 값이 남아야 자란 걸 보여 준다(규칙 11).
 * 키 자 옆의 키움이만 뺐다(9/29 「캐릭터 세워 두진 말고」 · 9/30 「통으로 없애냐」) — 입체 자는 둔다.
 */
function BodyGrowth({
  profileId,
  name,
  measurable,
  tests,
  fallback,
  lastTestedOn,
}: {
  profileId: string;
  name: string;
  /** 만 4세 미만이면 측정 단추를 없앤다(규칙 4) */
  measurable: boolean;
  tests: FitnessTestSummary[];
  fallback: { heightCm: number; weightKg: number; measuredOn: string } | undefined;
  lastTestedOn: string | null | undefined;
}) {
  const withBody = tests
    .filter(
      (t): t is FitnessTestSummary & { heightCm: number; weightKg: number } =>
        t.heightCm != null && t.weightKg != null,
    )
    .sort((a, b) => a.testedOn.localeCompare(b.testedOn));
  const first = withBody[0];
  const now = withBody[withBody.length - 1];
  const height = now?.heightCm ?? fallback?.heightCm ?? null;
  const weight = now?.weightKg ?? fallback?.weightKg ?? null;
  const measuredOn = now?.testedOn ?? fallback?.measuredOn ?? null;
  const grew = first && now && first !== now ? round1(now.heightCm - first.heightCm) : null;
  const due = (daysSince(lastTestedOn) ?? 0) >= REMEASURE_DAYS;
  // 측정한 적이 없고 이 기기에도 적어 둔 값이 없다. 빈 칸 안에 첫 측정 길을 두고 아래 「새로 재기」 는 세우지 않는다
  const firstMeasure = (height == null || weight == null) && measurable && !lastTestedOn;
  // 잰 기록 줄은 최근 것부터
  const newestFirst = [...withBody].reverse();
  // 키 자의 눈금 — 이력이 아직 없으면 최근 회차나 기기에 적어 둔 한 번이라도
  const rulerRecords = withBody.length
    ? withBody.map((t) => ({ date: t.testedOn, heightCm: t.heightCm, weightKg: t.weightKg }))
    : fallback
      ? [{ date: fallback.measuredOn, heightCm: fallback.heightCm, weightKg: fallback.weightKg }]
      : [];

  return (
    <Card>
      <CardHead
        title="키와 몸무게"
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
        <EmptyState
          size="card"
          scene="no-record"
          title="아직 키와 몸무게 기록이 없어요"
          description="측정하면 키가 자라는 모습을 여기에서 볼 수 있어요"
          action={
            firstMeasure && (
              <EmptyStateAction href={`/p/${profileId}/measure`}>첫 측정 하기</EmptyStateAction>
            )
          }
        />
      )}

      {/* 키 자 — 잰 날마다 눈금 하나, 옆에 키 · 몸무게 · 날짜(9/30 다시). 한 번만 쟀어도 선다 */}
      {rulerRecords.length > 0 && <GrowthRuler records={rulerRecords} className="mt-3" />}
      {grew != null && grew > 0 && first && (
        <p className="text-caption text-ink-soft mt-1 font-semibold">
          {formatDate(first.testedOn)}보다 <b className="text-ink">{grew}cm</b> 자랐어요
        </p>
      )}
      {/* 눈금이 하나뿐이면 견줄 것이 없다. 무엇을 하면 자란 만큼이 보이는지 한 줄 */}
      {rulerRecords.length === 1 && (
        <p className="text-caption text-ink-soft mt-1 font-semibold">
          다음에 측정하면 얼마나 자랐는지 보여 드려요
        </p>
      )}

      {/* 잰 기록 줄 — 두 번 넘게 쟀을 때만. 한 번은 위 값 칸이 말한다 */}
      {withBody.length > 1 && (
        <>
          <ul className="divide-rows border-line mt-3 border-t" aria-label="잰 기록">
            {newestFirst.map((t, i) => {
              const before = newestFirst[i + 1];
              const diff = before ? round1(t.heightCm - before.heightCm) : null;
              return (
                <li key={t.fitnessTestId} className="flex min-h-11 items-center gap-3 py-2">
                  <span className="text-ink-soft w-20 shrink-0 text-sm font-semibold">
                    {formatDate(t.testedOn)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold">
                    {t.heightCm}cm, {t.weightKg}kg
                  </span>
                  {/* 지난번보다 — 줄었다고 경고색을 칠하지 않는다(규칙 8) */}
                  {diff != null && diff !== 0 && (
                    <span
                      className={cn(
                        "text-sm font-extrabold",
                        diff > 0 ? "text-signal-deep" : "text-ink-soft",
                      )}
                    >
                      {diff > 0 ? `+${diff}` : diff}cm
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {measurable && !firstMeasure && (
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
      )}
    </Card>
  );
}

/** 소수 한 자리 — 0.1cm 까지만 적는다 */
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
