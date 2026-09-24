"use client";

import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { Card, CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { UnlockLadder } from "@/components/domain/unlock-ladder";
import { KiumMedal } from "@/components/scene/kium-medal";
import type { AchievementView } from "@/lib/api/types";
import { useProgress } from "@/lib/api/queries";
import { artFor } from "@/lib/art";
import { STAGES, badgeArt, levelProgress, stageOf } from "@/lib/levels";
import { whenOf } from "@/lib/notifications";
import { cn, formatDate } from "@/lib/utils";
import { dayOf } from "@/lib/today";
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
  const { data: progress, isPending, error, refetch } = useProgress(childProfileId ?? undefined);
  const [open, setOpen] = useState<AchievementView | null>(null);

  if (isPending) return <BadgesSkeleton />;
  if (error || !progress) {
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
  const bar = levelProgress(progress);
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
          <div
            className="bg-signal-soft mt-3 h-3 overflow-hidden rounded-full"
            role="progressbar"
            aria-label="다음 레벨까지"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(bar.ratio * 100)}
          >
            <span
              className="bg-signal block h-full rounded-full"
              style={{ width: `${Math.round(bar.ratio * 100)}%` }}
            />
          </div>
          <p className="text-caption text-ink-soft mt-1.5 font-bold">
            경험치 {progress.xp}
            {bar.left == null ? " · 가장 높은 레벨이에요" : ` · 다음 레벨까지 ${bar.left}`}
          </p>

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
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {achievements.map((a) => {
              const got = Boolean(a.earnedAt);
              return (
                <li key={a.code}>
                  <button
                    type="button"
                    onClick={() => setOpen(a)}
                    className="press bg-sub flex w-full flex-col items-center gap-1.5 rounded-2xl px-1.5 py-3"
                    aria-label={`${a.title}${got ? " · 받았어요" : " · 아직"}`}
                  >
                    <ArtIcon
                      name={badgeArt(a.code)}
                      className={cn("size-12", !got && "opacity-30 grayscale")}
                    />
                    <span
                      className={cn(
                        "text-micro text-center leading-tight font-bold",
                        !got && "text-ink-soft",
                      )}
                    >
                      {a.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
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

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.title}>
        {open && (
          <div className="flex flex-col items-center pb-2 text-center">
            {open.earnedAt ? (
              <KiumMedal
                art={artFor(badgeArt(open.code))}
                size={220}
                label={`${open.title} 메달`}
              />
            ) : (
              <ArtIcon name={badgeArt(open.code)} className="my-8 size-28 opacity-30 grayscale" />
            )}
            <p className="text-body mt-2 font-bold">{open.description}</p>
            <p className="text-caption text-ink-soft mt-1 font-semibold">
              {open.earnedAt ? `${formatDate(dayOf(open.earnedAt))}에 받았어요` : "아직이에요"}
            </p>
          </div>
        )}
      </Sheet>
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
