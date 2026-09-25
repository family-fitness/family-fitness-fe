"use client";

import { ArrowDown, ArrowUp, Minus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { Dock } from "@/components/ui/dock";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { NavLink } from "@/components/ui/nav-link";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvailability, useCreateMission, useFamilyProfiles } from "@/lib/api/queries";
import type { Uuid } from "@/lib/api/types";
import { errorMessage } from "@/lib/errors";
import {
  MAX_MOVES,
  MOVE_MINUTES,
  repeatDates,
  routineMinutes,
  routineTitle,
  toSessions,
  upcomingDays,
} from "@/lib/routine";
import { PHASE_LABEL } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { WEEKDAY, today, weekdayCode } from "@/lib/today";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";
import { useRoutineReady, useRoutineStore } from "@/stores/routine-store";

/**
 * 직접 짜기 — 담은 동작을 세우고, 누가 · 언제 할지 정해 등록한다.
 *
 * AI 편성의 다른 길이다(9/23 "선택해서 미션을 생성"). 부모가 고른 것이라 제안을 거치지 않고
 * 바로 그날의 운동이 된다. 여러 날 · 몇 주에 한 번에 넣을 수 있다(삼성헬스 프로그램처럼) —
 * 날마다 하나씩 따로 등록돼서, 한 날을 못 해도 다른 날은 그대로다.
 *
 * 누르는 차례가 곧 한 화면의 차례다: 동작 → 누가 → 언제 → 등록.
 */
const WEEKS = [
  { value: "1", label: "이번 한 번" },
  { value: "2", label: "2주" },
  { value: "4", label: "4주" },
] as const;

export default function CustomPlanPage() {
  return (
    <ParentOnly>
      <CustomPlan />
    </ParentOnly>
  );
}

function CustomPlan() {
  const router = useRouter();
  const { familyId } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: family } = useFamilyProfiles(familyId);
  const { data: availability } = useAvailability(childProfileId ?? undefined);
  const moves = useRoutineStore((s) => s.moves);
  const ready = useRoutineReady();
  const { shift, setMinutes, remove, tidy, clear } = useRoutineStore();
  const create = useCreateMission(familyId ?? "");

  const people = family?.profiles ?? [];
  const kids = people.filter((p) => p.role === "CHILD");
  const firstKid = kids.find((k) => k.profileId === childProfileId) ?? kids[0];
  const [who, setWho] = useState<Uuid[] | null>(null);
  const chosen = who ?? (firstKid?.profileId ? [firstKid.profileId] : []);
  const now = today();
  const [days, setDays] = useState<string[]>([now]);
  const [weeks, setWeeks] = useState<(typeof WEEKS)[number]["value"]>("1");
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** 등록을 마쳤다 — 떠나는 사이 담은 동작이 비어 「아직 없어요」 가 번쩍 뜨지 않게 */
  const [sent, setSent] = useState(false);
  /** 이미 등록한 날 — 중간에 실패해 다시 누르면 이 날들은 건너뛴다(두 번 생기지 않게) */
  const [created, setCreated] = useState<string[]>([]);
  /** 화면을 떠났나 — 등록이 끝나도 떠난 사람을 캘린더로 끌고 가지 않는다 */
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);

  const minutes = routineMinutes(moves);
  const dates = repeatDates(days, Number(weeks));
  const pending = dates.filter((d) => !created.includes(d));
  const free = new Set((availability?.slots ?? []).map((s) => s.day));
  const upcoming = upcomingDays(now);

  const toggleWho = (id: Uuid) =>
    setWho(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  const toggleDay = (d: string) =>
    setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort()));

  const submit = async () => {
    if (moves.length === 0 || chosen.length === 0 || pending.length === 0) return;
    setProblem(null);
    setSaving(true);
    const sessions = toSessions(moves);
    const done: string[] = [];
    try {
      // 날마다 따로 — 한 날을 못 해도 다른 날은 그대로 남는다. 이미 된 날은 건너뛴다
      for (const date of pending) {
        await create.mutateAsync({
          title: routineTitle(moves),
          startDate: date,
          endDate: date,
          targetMetric: "TIMER_MINUTES",
          targetValue: minutes,
          participantProfileIds: chosen,
          sessions,
        });
        done.push(date);
      }
      // 다 등록했다. 담아 둔 동작은 비운다 — 떠난 뒤라도
      clear();
      if (!here.current) return;
      setSent(true);
      router.push(dates.length === 1 && dates[0] === now ? "/parent" : "/calendar");
    } catch (e) {
      const made = [...created, ...done];
      setCreated(made);
      const reason = errorMessage(
        e,
        { NOT_A_PARENT: "보호자만 운동을 만들 수 있어요." },
        "등록하지 못했어요. 잠시 후 다시 해 주세요.",
      );
      setProblem(
        made.length > 0
          ? `${made.length}일은 등록됐어요. 남은 날은 다시 눌러 주세요 — ${reason}`
          : reason,
      );
    } finally {
      if (here.current) setSaving(false);
    }
  };

  if (sent) {
    return (
      <>
        <AppBar back title="직접 짜기" />
        <Stage wide>
          <p className="card-hero text-center text-sm font-extrabold" role="status">
            등록했어요
          </p>
        </Stage>
      </>
    );
  }

  // 탭 저장소를 읽기 전에는 빈 루틴이 아니라 기다리는 모양 — 「아직 없어요」 가 번쩍 뜨지 않게
  if (!ready) {
    return (
      <>
        <AppBar back title="직접 짜기" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </Stage>
      </>
    );
  }

  if (moves.length === 0) {
    return (
      <>
        <AppBar back title="직접 짜기" />
        <Stage wide>
          <EmptyState
            scene="no-mission"
            title="아직 담은 동작이 없어요"
            action={
              <NavLink
                href="/videos"
                className="press bg-signal-strong mt-2 flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
              >
                동작 고르러 가기
              </NavLink>
            }
          />
        </Stage>
      </>
    );
  }

  const label =
    dates.length === 1 && dates[0] === now
      ? "오늘 운동으로 등록"
      : created.length > 0
        ? `남은 ${pending.length}일 등록`
        : `${dates.length}일에 등록`;

  return (
    <>
      <AppBar back title="직접 짜기" />
      <Stage wide className="space-y-3 pb-36">
        {/* 1. 동작 — 하는 차례대로. 위아래로 옮기고 시간을 정한다 */}
        <Card hero>
          <CardHead
            title={`동작 ${moves.length}개 · ${minutes}분`}
            meta={
              <button
                type="button"
                onClick={tidy}
                className="press text-signal-deep min-h-10 px-1 text-xs font-extrabold"
              >
                준비 → 본 → 정리로
              </button>
            }
          />
          <ol className="divide-rows mt-1">
            {moves.map((m, i) => (
              <li key={m.clip.clipId} className="py-3">
                {/* 첫 줄 — 차례 · 이름 · 빼기. 이름이 잘리지 않게 한 줄을 다 준다 */}
                <div className="flex items-start gap-2">
                  <span className="text-signal-deep w-6 shrink-0 text-center text-sm leading-snug font-extrabold tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug font-extrabold">{m.clip.title}</p>
                    <p className="text-caption text-ink-soft">{PHASE_LABEL[m.clip.phase]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`${m.clip.title} 빼기`}
                    className="press text-ink-soft -mt-2 -mr-2 grid size-10 shrink-0 place-items-center"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
                {/* 둘째 줄 — 시간 · 차례 옮기기 */}
                <div className="mt-2 flex items-center justify-between pl-8">
                  <div className="bg-sub flex items-center rounded-full">
                    <button
                      type="button"
                      onClick={() => setMinutes(i, m.minutes - 1)}
                      disabled={m.minutes <= MOVE_MINUTES.min}
                      aria-label={`${m.clip.title} 1분 줄이기`}
                      className="press grid size-10 place-items-center disabled:opacity-30"
                    >
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-extrabold tabular-nums">
                      {m.minutes}분
                    </span>
                    <button
                      type="button"
                      onClick={() => setMinutes(i, m.minutes + 1)}
                      disabled={m.minutes >= MOVE_MINUTES.max}
                      aria-label={`${m.clip.title} 1분 늘리기`}
                      className="press grid size-10 place-items-center disabled:opacity-30"
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => shift(i, -1)}
                      disabled={i === 0}
                      aria-label={`${m.clip.title} 위로`}
                      className="press bg-sub grid size-10 place-items-center rounded-full disabled:opacity-30"
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => shift(i, 1)}
                      disabled={i === moves.length - 1}
                      aria-label={`${m.clip.title} 아래로`}
                      className="press bg-sub grid size-10 place-items-center rounded-full disabled:opacity-30"
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {moves.length < MAX_MOVES && (
            <NavLink
              href="/videos"
              className="press text-signal-deep mt-1 flex min-h-11 items-center justify-center text-sm font-extrabold"
            >
              동작 더 담기
            </NavLink>
          )}
        </Card>

        {/* 2. 누가 — 아이 혼자 · 엄마랑 같이 */}
        <Card>
          <CardHead title="누가 할까요" meta={`${chosen.length}명`} />
          <ul className="mt-3 flex flex-wrap gap-2">
            {people.map((p) => {
              const on = chosen.includes(p.profileId ?? "");
              return (
                <li key={p.profileId}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => p.profileId && toggleWho(p.profileId)}
                    className={cn(
                      "press flex min-h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-extrabold",
                      on ? "bg-signal-soft text-signal-deep ring-signal ring-2" : "bg-sub",
                    )}
                  >
                    <ProfileAvatar
                      profileId={p.profileId}
                      name={p.name}
                      size="sm"
                      tone={p.role === "CHILD" ? "signal" : "mark"}
                    />
                    {p.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* 3. 언제 — 이번 주 날짜. 운동할 수 있는 날에 점 */}
        <Card>
          <CardHead title="언제 할까요" meta={`${dates.length}일`} />
          <ul className="mt-3 grid grid-cols-7 gap-1.5">
            {upcoming.map((d) => {
              const on = days.includes(d);
              return (
                <li key={d}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${Number(d.slice(8))}일 ${WEEKDAY[new Date(`${d}T00:00:00`).getDay()]}요일${free.has(weekdayCode(d)) ? " · 운동할 수 있는 날" : ""}`}
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "press flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-extrabold",
                      on ? "bg-signal-strong text-white" : "bg-sub",
                    )}
                  >
                    <span className={cn(!on && "text-ink-soft")}>
                      {d === now ? "오늘" : WEEKDAY[new Date(`${d}T00:00:00`).getDay()]}
                    </span>
                    <span className="text-sm tabular-nums">{Number(d.slice(8))}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        free.has(weekdayCode(d))
                          ? on
                            ? "bg-white"
                            : "bg-signal"
                          : "bg-transparent",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-caption text-ink-soft mt-2">
            점 · 운동할 수 있는 날 ·{" "}
            <NavLink href="/settings/schedule" className="text-signal-deep font-bold">
              바꾸기
            </NavLink>
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-sm font-bold">되풀이</p>
            <Segmented value={weeks} options={WEEKS} onChange={setWeeks} label="몇 주 되풀이" />
          </div>
        </Card>
      </Stage>

      <Dock>
        <div className="card-hero py-3">
          <p className="text-caption text-ink-soft text-center font-semibold">
            {moves.length}개 · {minutes}분 ·{" "}
            {people
              .filter((p) => chosen.includes(p.profileId ?? ""))
              .map((p) => p.name)
              .join(" · ") || "아무도 안 골랐어요"}
          </p>
          {problem && (
            <p role="alert" className="text-signal-deep mt-1 text-center text-sm font-semibold">
              {problem}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || chosen.length === 0 || pending.length === 0}
            data-off={!saving && (chosen.length === 0 || pending.length === 0) ? "" : undefined}
            className="press bg-signal-strong data-off:bg-line data-off:text-ink-soft mt-2 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white disabled:opacity-100 data-off:shadow-none"
          >
            {saving ? "등록하는 중" : label}
          </button>
        </div>
      </Dock>
    </>
  );
}
