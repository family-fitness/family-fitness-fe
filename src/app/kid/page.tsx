"use client";

import { Play, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { IconLink } from "@/components/ui/icon-link";
import { Illustration } from "@/components/ui/illustration";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteParent } from "@/components/domain/invite-parent";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { WeekStrip } from "@/components/domain/week-strip";
import type { Mission } from "@/lib/api/types";
import { useCalendar, useFitnessMap, useMissions, useProgress } from "@/lib/api/queries";
import { levelProgress, stageOf } from "@/lib/levels";
import { PHASE_LABEL, sessionsOf, totalMinutes } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { longDate, today, weekOf } from "@/lib/today";
import { useRoleStore } from "@/stores/role-store";

/**
 * 아이 홈.
 *
 * 맨 위는 **자라는 캐릭터**다 — 운동을 하면 경험치가 차고, 레벨 둘마다 모습이 자란다.
 * 해야 할 일은 오늘 운동 카드의 큰 버튼 하나다. 나머지는 보는 것이다.
 *
 * 여기에 없는 것: 등급, 약한 요인, 형제 비교, 체력 육각형(규칙 10).
 */
export default function KidHomePage() {
  const router = useRouter();
  const { familyId, isPending, error: sessionError } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);

  const {
    data: map,
    isPending: mapPending,
    error: mapError,
    refetch: refetchMap,
    isRefetching,
  } = useFitnessMap(familyId);
  const { data: missions } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });
  const { data: progress } = useProgress(childProfileId ?? undefined);
  const week = weekOf();
  const { data: calendar } = useCalendar(familyId, childProfileId ?? undefined, week);

  const me = map?.members?.find((m) => m.profileId === childProfileId);

  // /me 가 실패하면 가족 지도는 시작도 못 한다. 실패를 기다림보다 먼저 본다
  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar title="오늘" />
        <Stage wide>
          <ErrorState error={failure} onRetry={() => void refetchMap()} retrying={isRefetching} />
        </Stage>
      </>
    );
  }

  if (isPending || mapPending) return <KidHomeSkeleton />;

  if (!me) {
    return (
      <>
        <AppBar title="안녕!" />
        <Stage wide className="flex flex-col items-center pt-10 text-center">
          <Illustration name="scene/scene-pick-role" fallback="scene/scene-invite" size={150} />
          <p className="mt-4 text-xl font-extrabold">누구인지 골라 주세요</p>
          <button
            type="button"
            onClick={() => router.push("/start")}
            className="press bg-signal-strong mt-5 rounded-2xl px-6 py-4 text-lg font-extrabold text-white"
          >
            고르러 가기
          </button>
        </Stage>
      </>
    );
  }

  const now = today();
  const mine = (missions?.missions ?? []).filter(
    (m) =>
      (m.startDate ?? "") <= now &&
      now <= (m.endDate ?? "") &&
      m.targetMetric !== "STEPS" &&
      m.participants?.some((p) => p.profileId === childProfileId),
  );
  const todo = mine.find(
    (m) => !m.participants?.find((p) => p.profileId === childProfileId)?.completed,
  );
  const stage = stageOf(progress?.level);
  const bar = progress ? levelProgress(progress) : null;
  const score = me.latest?.overallPercentile ?? null;

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-4">
        <p className="text-caption text-ink-soft font-semibold">{longDate()}</p>
        <IconLink href="/settings" label="설정" className="-mr-2">
          <Settings className="size-6" strokeWidth={1.8} />
        </IconLink>
      </div>

      <Stage wide className="space-y-3">
        {/* 나 — 이름과 자라는 캐릭터. 아이는 자기 이름을 먼저 찾는다 */}
        <section className="flex flex-col items-center pt-1 pb-2 text-center">
          <LevelBuddy stage={stage.stage} size={148} label={stage.name} />
          <h1 className="page-title mt-1 max-w-full break-words">{me.name}</h1>
          {progress ? (
            <>
              <p className="text-caption text-ink-soft mt-1 font-bold">
                Lv.{progress.level} · {stage.name}
              </p>
              <div className="mt-2.5 w-full max-w-60">
                <div
                  className="bg-signal-soft h-2.5 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-label="다음 레벨까지"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((bar?.ratio ?? 0) * 100)}
                >
                  <span
                    className="bg-signal block h-full rounded-full"
                    style={{ width: `${Math.round((bar?.ratio ?? 0) * 100)}%` }}
                  />
                </div>
                <p className="text-micro text-ink-soft mt-1.5 font-bold">
                  {bar?.left == null ? "가장 높은 레벨이에요" : `다음 레벨까지 ${bar.left}`}
                </p>
              </div>
            </>
          ) : (
            <Skeleton className="mt-2 h-4 w-40" />
          )}
        </section>

        {/* 오늘 할 일 하나. 이 화면에서 누를 큰 것은 이것뿐이다 */}
        {todo ? (
          <TodayHero mission={todo} />
        ) : mine.length > 0 ? (
          <div className="card-hero text-center">
            <p className="text-lead font-extrabold">오늘 거 다 했어요!</p>
            <p className="text-caption text-ink-soft mt-1">엄마 · 아빠가 보고 있어요</p>
          </div>
        ) : (
          <div className="card-hero">
            <p className="text-lead font-extrabold">오늘 운동이 아직 없어요</p>
            <p className="text-caption text-ink-soft mt-1">
              엄마 · 아빠가 짜 주면 여기에 떠요. 같이 하자고 불러 볼까요?
            </p>
            <InviteParent
              familyId={familyId ?? ""}
              childProfileId={childProfileId ?? ""}
              className="mt-3"
            />
          </div>
        )}

        <Card>
          <CardHead
            title="이번 주"
            meta={
              progress && progress.streakDays > 1
                ? `${progress.streakDays}일 이어서 했어요`
                : undefined
            }
          />
          <div className="mt-2">
            <WeekStrip days={week.days} logs={calendar?.days} />
          </div>
        </Card>

        {/* 점수 하나는 아이도 본다. 등수로 바꾸지 않고 또래 평균 50 과 같이(규칙 10) */}
        <Card>
          <CardHead title="내 체력 점수" />
          {score != null ? (
            <div className="mt-1">
              <p className="metric-value text-metric">
                {score}
                <span className="metric-unit">점</span>
              </p>
              <div
                className="record-rail mt-2.5"
                role="img"
                aria-label={`내 점수 ${score}, 또래 평균 50`}
              >
                <span className="record-fill" style={{ width: `${score}%` }} />
                <span className="record-avg" />
              </div>
              <p className="text-caption text-ink-soft mt-1.5">가운데 눈금이 또래 평균 50이에요</p>
            </div>
          ) : (
            <p className="text-ink-soft mt-1 text-sm">아직 재지 않았어요</p>
          )}
        </Card>
      </Stage>
    </>
  );
}

/** 오늘 운동 — 파랑 큰 카드. 누르면 바로 운동하기로 */
function TodayHero({ mission }: { mission: Mission }) {
  const sessions = sessionsOf(mission);
  const minutes = totalMinutes(sessions);
  const phases = (["WARMUP", "MAIN", "COOLDOWN"] as const)
    .map((p) => [p, sessions.filter((s) => s.phase === p).length] as const)
    .filter(([, n]) => n > 0)
    .map(([p, n]) => `${PHASE_LABEL[p].replace("운동", "")} ${n}`)
    .join(" · ");
  const done = sessions.filter((s) => s.completed).length;

  return (
    <NavLink
      href={`/kid/m/${mission.missionId}`}
      className="press bg-signal-strong shadow-lift block rounded-3xl p-5 text-white"
    >
      <p className="text-caption font-bold text-white/85">오늘 운동</p>
      <p className="text-metric mt-1 leading-tight font-extrabold">
        {sessions.length}개 · {minutes}분
      </p>
      <p className="text-caption mt-1 font-semibold text-white/85">
        {phases}
        {done > 0 && ` · ${done}개 했어요`}
      </p>
      <span className="text-signal-strong mt-4 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white text-lg font-extrabold">
        <Play aria-hidden className="size-5 fill-current" />
        {done > 0 ? "이어서 하기" : "시작하기"}
      </span>
    </NavLink>
  );
}

function KidHomeSkeleton() {
  return (
    <Stage wide className="space-y-3 pt-12">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-36 rounded-full" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
    </Stage>
  );
}
