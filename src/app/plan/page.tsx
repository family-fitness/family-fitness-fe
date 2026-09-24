"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Stage } from "@/components/app-shell/stage";
import { Dock } from "@/components/ui/dock";
import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorIcon } from "@/components/domain/factor-icon";
import { FactorRadar } from "@/components/domain/factor-radar";
import {
  useAvailability,
  useFitnessMap,
  useLatestFitnessTest,
  useStartCoachRun,
} from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { FACTORS, type Factor } from "@/lib/fitness-factors";
import { useSession } from "@/lib/session";
import { today, weekdayCode } from "@/lib/today";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";
import { useRoutineReady, useRoutineStore } from "@/stores/routine-store";

/**
 * AI 편성 — 조건 고르기.
 *
 * **채팅이 아니라 칩이다.** 열린 질문을 받으면 「우리 애 살 빼려면?」 같은 답하면 안 되는
 * 질문까지 들어온다. 고를 수 있는 것만 두면 막을 것이 없고, 부모는 자기가 조종한다고 느낀다.
 *
 * 키울 힘을 고르지 않으면 코치가 가장 낮은 요인을 고른다 — 육각형에서 안쪽으로
 * 들어간 꼭지점이다. 그래서 여기에 그 육각형을 같이 둔다.
 */
const MINUTES = [10, 20, 30, 40] as const;

/** 적어 둔 시간을 고를 수 있는 칸 중 가장 가까운 것으로 */
function nearest(m: number) {
  return MINUTES.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
}

export default function PlanPage() {
  return (
    <ParentOnly>
      <PlanForm />
    </ParentOnly>
  );
}

function PlanForm() {
  const router = useRouter();
  const { familyId, profile } = useSession();
  const { data: map, isPending } = useFitnessMap(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const kids = (map?.members ?? []).filter((m) => m.role === "CHILD");
  const kid = kids.find((k) => k.profileId === childProfileId) ?? kids[0];
  const { data: latest } = useLatestFitnessTest(kid?.profileId);
  const start = useStartCoachRun(familyId ?? "");

  const { data: availability } = useAvailability(kid?.profileId);
  // 고르기 전에는 오늘 적어 둔 시간이 기본이다. 적어 둔 게 없으면 20분
  const [picked, setPicked] = useState<number | null>(null);
  const todaySlot = availability?.slots.find((s) => s.day === weekdayCode());
  const minutes = picked ?? nearest(todaySlot?.minutes ?? 20);
  const setMinutes = setPicked;
  const [place, setPlace] = useState<"HOME" | "OUTDOOR">("HOME");
  const [quiet, setQuiet] = useState(true);
  const [focus, setFocus] = useState<Factor | null>(null);
  // 운동 찾기에서 담아 둔 동작 — 있으면 직접 짜기로 바로
  const gathered = useRoutineStore((s) => s.moves.length);
  useRoutineReady();
  // 참여 방식이 「매번 같이」 면 부모도 같이가 기본이다
  const [withParent, setWithParent] = useState(profile?.supportMode === "FULL");
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <>
        <AppBar backHref="/parent" title="오늘 운동 짜기" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </Stage>
      </>
    );
  }

  const name = kid?.name ?? "아이";
  // 서버가 준 가장 낮은 요인. 부모가 고르지 않으면 코치가 이걸 키운다
  const weakest = latest?.weakest?.factor as Factor | undefined;
  const shownFocus = focus ?? weakest ?? null;

  const submit = async () => {
    if (!kid?.profileId) return;
    setError(null);
    try {
      const run = await start.mutateAsync({
        profileId: kid.profileId,
        date: today(),
        minutes,
        quiet,
        place,
        focusFactor: focus,
        withParent,
      });
      router.push(`/plan/run/${run.coachRunId}`);
    } catch (e) {
      setError(
        errorMessage(
          e,
          { NOT_A_PARENT: "보호자만 운동을 짤 수 있어요." },
          "짜 달라고 하지 못했어요. 잠시 후 다시 해 주세요.",
        ),
      );
    }
  };

  return (
    <>
      <AppBar backHref="/parent" title="오늘 운동 짜기" />
      <Stage wide className="space-y-3 pb-28">
        <section className="card-hero">
          <p className="text-lead font-extrabold">{name}의 오늘 운동을 짜 드려요</p>
          <FactorRadar
            points={latest?.radar}
            name={name}
            focus={shownFocus}
            legend={false}
            className="mx-auto mt-2 max-w-72"
          />
          {shownFocus && (
            <p className="bg-signal-soft text-signal-deep mt-1 rounded-2xl px-4 py-2.5 text-center text-sm font-bold">
              {focus ? `고른 힘 · ${shownFocus}` : `키울 힘 · ${shownFocus} — 가장 낮은 요인`}
            </p>
          )}
        </section>

        {/* AI 말고 직접 — 운동 찾기에서 동작을 담아 짠다 */}
        <NavLink
          href={gathered > 0 ? "/plan/custom" : "/videos"}
          className="card press flex min-h-16 items-center gap-3"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">직접 고를래요</span>
            {gathered > 0 && (
              <span className="text-caption text-ink-soft mt-0.5 block">
                담아 둔 동작 {gathered}개
              </span>
            )}
          </span>
          <ChevronRight aria-hidden className="text-ink-soft size-5 shrink-0" />
        </NavLink>

        <section className="card">
          <CardHead
            title="몇 분 할까요"
            meta={
              <NavLink
                href="/settings/schedule"
                className="press text-signal-deep inline-flex min-h-10 items-center font-bold"
              >
                {todaySlot
                  ? `오늘 적어 둔 시간 ${todaySlot.minutes}분 · 바꾸기`
                  : "운동할 수 있는 시간 적기"}
              </NavLink>
            }
          />
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="운동 시간">
            {MINUTES.map((m) => (
              <Chip key={m} on={minutes === m} onClick={() => setMinutes(m)}>
                {m}분
              </Chip>
            ))}
          </div>
        </section>

        <section className="card space-y-3">
          <div>
            <CardHead title="어디서" />
            <div className="mt-2 flex gap-2" role="group" aria-label="어디서">
              <Chip on={place === "HOME"} onClick={() => setPlace("HOME")}>
                집에서
              </Chip>
              <Chip on={place === "OUTDOOR"} onClick={() => setPlace("OUTDOOR")}>
                밖에서
              </Chip>
            </div>
          </div>
          <div>
            <CardHead title="소리" />
            <div className="mt-2 flex gap-2" role="group" aria-label="소리">
              <Chip on={quiet} onClick={() => setQuiet(true)}>
                조용히 할래요
              </Chip>
              <Chip on={!quiet} onClick={() => setQuiet(false)}>
                상관없어요
              </Chip>
            </div>
          </div>
        </section>

        <section className="card">
          <CardHead title="키우고 싶은 힘" />
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="키우고 싶은 힘">
            <button
              type="button"
              aria-pressed={focus === null}
              onClick={() => setFocus(null)}
              className={cn(
                "press col-span-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold",
                focus === null ? "bg-signal-strong text-white" : "bg-sub",
              )}
            >
              <ArtIcon name="icon/menu-ai" className="size-5" />
              알아서 골라 주세요
            </button>
            {FACTORS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={focus === f}
                onClick={() => setFocus(f)}
                className={cn(
                  "press flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2",
                  focus === f ? "bg-signal-strong text-white" : "bg-sub",
                )}
              >
                <FactorIcon
                  factor={f}
                  className={cn("size-6", focus === f ? "text-white" : "text-signal-strong")}
                />
                <span className="text-caption font-bold">{f}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <CardHead title="누가 해요" />
          <div className="mt-2 flex gap-2" role="group" aria-label="누가 해요">
            <Chip on={!withParent} onClick={() => setWithParent(false)}>
              {name} 혼자
            </Chip>
            <Chip on={withParent} onClick={() => setWithParent(true)}>
              {profile?.name ?? "나"}도 같이
            </Chip>
          </div>
        </section>

        {error && (
          <p role="alert" className="card text-signal-deep text-sm font-semibold">
            {error}
          </p>
        )}
      </Stage>

      {/* 아래에 붙는 한 단추. 조건을 다 내려 보고 나서 누른다 */}
      <Dock>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={start.isPending || !kid}
          className="press bg-signal-strong shadow-lift flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white disabled:opacity-60"
        >
          <ArtIcon name="icon/menu-ai" className="size-5" />
          {start.isPending ? "코치에게 보내는 중" : `AI 에게 ${minutes}분 짜 달라기`}
        </button>
      </Dock>
    </>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("chip press", on && "chip-on")}
    >
      {children}
    </button>
  );
}
