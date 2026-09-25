"use client";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { AchievementGrid } from "@/components/domain/achievement-grid";
import { UnlockLadder } from "@/components/domain/unlock-ladder";
import { XpGauge } from "@/components/domain/xp-gauge";
import { useProgress } from "@/lib/api/queries";
import { STAGES, stageOf } from "@/lib/levels";
import { whenOf } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";

/**
 * 레벨과 업적 — 아이.
 *
 * 경험치는 **줄지 않는다.** 쉰 날에 깎이는 점수는 벌이 된다.
 * 얻은 업적을 누르면 메달이 한 바퀴 반 돌며 나타난다(three.js — 키움 섬과 같은 결).
 * 아직인 업적은 회색으로, 어떻게 얻는지를 같이 적는다 — 못 한 것이 아니라 아직인 것이다.
 *
 * 경험치 숫자 규칙은 서버가 정한다. 화면은 규칙을 숫자로 적지 않고, 서버가 준
 * 「최근에 얻은 경험치」 만 숫자로 보여 준다 — 규칙이 바뀌어도 화면이 거짓말을 하지 않게.
 */
export default function BadgesPage() {
  const childProfileId = useRoleStore((s) => s.childProfileId);
  // 꺼진 조회(아이를 아직 안 골랐을 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const { data: progress, isLoading, error, refetch } = useProgress(childProfileId ?? undefined);

  if (isLoading) return <BadgesSkeleton />;
  if (!childProfileId) {
    return (
      <>
        <AppBar backHref="/kid" title="레벨과 업적" />
        <Stage wide>
          <EmptyState
            scene="waiting"
            title="누구인지 골라 주세요"
            action={
              <NavLink
                href="/start"
                className="press bg-signal-strong mt-2 flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
              >
                고르러 가기
              </NavLink>
            }
          />
        </Stage>
      </>
    );
  }
  if (!progress) {
    return (
      <>
        <AppBar backHref="/kid" title="레벨과 업적" />
        <Stage wide>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  const stage = stageOf(progress.level);
  const achievements = progress.achievements;

  return (
    <>
      <AppBar backHref="/kid" title="레벨과 업적" />
      <Stage wide className="space-y-3">
        <section className="card-hero">
          <p className="metric-label">지금 레벨</p>
          <p className="metric-value text-metric-lg mt-1">
            Lv.{progress.level}
            <span className="metric-unit">{stage.name}</span>
          </p>
          <XpGauge progress={progress} className="mt-3" />

          {/* 다섯 모습 — 지금 모습만 진하게. 앞으로 될 모습은 흐리게 미리 보인다 */}
          <ol className="mt-4 grid grid-cols-5 gap-1" aria-label="키움이가 자라는 모습">
            {STAGES.map((s) => {
              const now = s.stage === stage.stage;
              const ahead = s.stage > stage.stage;
              return (
                <li
                  key={s.stage}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl py-2",
                    now && "bg-signal-soft",
                  )}
                  aria-current={now ? "step" : undefined}
                >
                  <LevelBuddy
                    stage={s.stage}
                    size={48}
                    className={cn(ahead && "opacity-35 grayscale")}
                  />
                  <span
                    className={cn(
                      "text-micro leading-tight font-bold",
                      now ? "text-signal-deep" : "text-ink-soft",
                    )}
                  >
                    {s.name.replace(" 키움이", "")}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <UnlockLadder level={progress.level} />

        <Card>
          <CardHead title="업적" />
          <div className="mt-2">
            <AchievementGrid achievements={achievements} />
          </div>
        </Card>

        {progress.recentXp.length > 0 && (
          <Card>
            <CardHead title="최근에 얻은 경험치" />
            <ul className="divide-rows mt-1">
              {progress.recentXp.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{e.reason}</p>
                    <p className="text-micro text-faint font-semibold">{whenOf(e.at)}</p>
                  </div>
                  <span className="text-signal-deep shrink-0 text-sm font-extrabold tabular-nums">
                    +{e.amount}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Stage>
    </>
  );
}

function BadgesSkeleton() {
  return (
    <>
      <AppBar backHref="/kid" title="레벨과 업적" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
