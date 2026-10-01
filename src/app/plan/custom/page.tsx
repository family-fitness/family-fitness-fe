"use client";

import { ArrowDown, ArrowUp, Minus, Plus, X } from "lucide-react";
import Link from "next/link";
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
import { VideoThumb } from "@/components/ui/video-thumb";
import {
  useAvailabilities,
  useCreateMission,
  useFamilyProfiles,
  useRestDaysIn,
} from "@/lib/api/queries";
import type { Uuid, Weekday } from "@/lib/api/types";
import { errorMessage } from "@/lib/errors";
import {
  MAX_MOVES,
  MOVE_MINUTES,
  routineMinutes,
  routineTitle,
  toSessions,
  upcomingDays,
} from "@/lib/routine";
import { WEEK, dayLabel, sharedDays } from "@/lib/schedule";
import { PHASE_LABEL } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { monthOf, today, weekOf, weekdayCode } from "@/lib/today";
import { cn } from "@/lib/utils";
import { childFinderHref, clipHref } from "@/lib/videos";
import { useRoleStore } from "@/stores/role-store";
import { useRoutineReady, useRoutineStore } from "@/stores/routine-store";

/**
 * 직접 만들기. 담은 동작을 세우고, 누가 어느 요일에 몇 주 동안 할지 정해 루틴으로 등록한다.
 *
 * AI 운동 추천의 다른 길이다(9/23 "선택해서 미션을 생성"). 보호자가 고른 것이라 제안을 거치지 않고
 * 바로 그날의 운동이 된다. 루틴은 서버에 날마다 하나씩 따로 등록돼서, 한 날을 못 해도 다른 날은 그대로다.
 *
 * 누르는 차례가 곧 한 화면의 차례다: 동작, 누가, 운동 요일과 기간, 등록.
 */
const WEEKS = [
  { value: "1", label: "이번 주만" },
  { value: "2", label: "2주" },
  { value: "4", label: "4주" },
] as const;

/** 요일 글자를 월요일부터 이어 쓴다. 「월, 수, 금」 */
function weekdayList(list: readonly Weekday[]): string {
  return WEEK.filter((d) => list.includes(d))
    .map(dayLabel)
    .join(", ");
}

export default function CustomPlanPage() {
  return (
    <ParentOnly>
      <CustomPlan />
    </ParentOnly>
  );
}

function CustomPlan() {
  const { familyId, error: sessionError, refetch: refetchMe } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const {
    data: family,
    isLoading: familyLoading,
    error: familyError,
    refetch: refetchFamily,
  } = useFamilyProfiles(familyId);
  const moves = useRoutineStore((s) => s.moves);
  const ready = useRoutineReady();
  const { shift, setMinutes, remove, tidy, clear } = useRoutineStore();
  const create = useCreateMission(familyId ?? "");

  const people = family?.profiles ?? [];
  const kids = people.filter((p) => p.role === "CHILD");
  const firstKid = kids.find((k) => k.profileId === childProfileId) ?? kids[0];
  const [who, setWho] = useState<Uuid[] | null>(null);
  const chosen = who ?? (firstKid?.profileId ? [firstKid.profileId] : []);
  const kidIds = new Set(kids.map((k) => k.profileId ?? ""));
  // 아이가 적어도 하나 — 부모만 하는 운동은 아이 화면 · 캘린더 · 리그 어디에도 안 보인다
  const chosenKid = chosen.find((id) => kidIds.has(id));
  // 운동 루틴에 적은 요일은 고른 사람 모두의 시간표가 겹치는 요일이다. 첫 아이 것만 보면
  // 아이는 평일, 보호자는 주말인데도 평일이 골라졌다
  const schedules = useAvailabilities(chosen);
  const now = today();
  /** 보호자가 직접 고른 요일. 손대기 전(null)에는 운동 루틴에 적은 요일을 쓴다 */
  const [picked, setPicked] = useState<Weekday[] | null>(null);
  const [weeks, setWeeks] = useState<(typeof WEEKS)[number]["value"]>("4");
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /**
   * 등록을 마치고 보여 줄 요약 한 줄. 떠나는 사이 담은 동작이 비어 「아직 없어요」 가
   * 번쩍 뜨지 않게, 이 값이 있으면 등록 안내만 세운다
   */
  const [sent, setSent] = useState<string | null>(null);
  /** 이미 등록한 날 — 중간에 실패해 다시 누르면 이 날들은 건너뛴다(두 번 생기지 않게) */
  const [created, setCreated] = useState<string[]>([]);
  /** 화면을 떠났나. 떠난 뒤에 등록이 끝나면 화면 상태를 건드리지 않는다 */
  const here = useRef(true);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);

  const minutes = routineMinutes(moves);
  const free = schedules ? sharedDays(schedules.map((w) => w.slots)) : [];
  // 운동 루틴을 아직 안 적었으면 오늘 요일 하나로 시작한다
  const weekdays = picked ?? (free.length > 0 ? free : [weekdayCode(now)]);
  const freeLabel = chosen.length > 1 ? "다 같이 운동할 수 있는 요일" : "운동 루틴에 적은 요일";
  /*
    기간은 오늘부터 센다. 이번 주만은 오늘부터 이번 주 일요일까지, 2주와 4주는 오늘부터 14일과 28일.
    그 사이 고른 요일마다 하루씩 운동이 생긴다. 오늘 요일을 골랐으면 오늘부터다
  */
  const span =
    weeks === "1" ? weekOf(now).days.filter((d) => d >= now) : upcomingDays(now, 7 * Number(weeks));
  /*
    쉬는 날 카드를 쓴 날에는 운동을 넣지 않는다. 쉬는 날이 이어서 한 날, 리그에서 빠지는 날인데
    직접 만들기로 운동을 넣으면 아이 홈은 「오늘은 쉬는 날이에요」 이고 운동은 걸려 있는 날이 된다.
    기간이 든 달의 쉬는 날을 모두 받는다(4주면 달을 넘는다)
  */
  const rest = useRestDaysIn(familyId ?? undefined, [...new Set(span.map(monthOf))]);
  const inPeriod = span.filter((d) => weekdays.includes(weekdayCode(d)));
  const dates = inPeriod.filter((d) => !rest.has(d));
  const skippedRest = inPeriod.length - dates.length;
  const pending = dates.filter((d) => !created.includes(d));
  /** 「매주 월, 수, 금, 4주 동안(12회)」 처럼 사람이 읽는 한 줄 */
  const summary =
    weekdays.length === 0
      ? "운동 요일을 골라 주세요"
      : dates.length === 0
        ? weeks === "1"
          ? "이번 주에는 남은 운동 요일이 없어요"
          : "고른 요일이 모두 쉬는 날이에요"
        : weeks === "1"
          ? `이번 주 ${weekdayList(dates.map(weekdayCode))}(${dates.length}회)`
          : `${dates[0] === now ? "오늘부터 " : ""}매주 ${weekdayList(weekdays)}, ${weeks}주 동안(${dates.length}회)`;

  const toggleWho = (id: Uuid) => {
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
    // 마지막 아이는 빼지 않는다 — 다른 아이를 먼저 고르면 바꿀 수 있다
    if (!next.some((x) => kidIds.has(x))) return;
    setWho(next);
  };
  const toggleWeekday = (d: Weekday) =>
    setPicked(weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d]);

  const submit = async () => {
    if (moves.length === 0 || !chosenKid || pending.length === 0) return;
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
      // 다 등록했다. 담아 둔 동작은 비운다. 떠난 뒤라도
      clear();
      if (!here.current) return;
      setSent(summary);
    } catch (e) {
      const made = [...created, ...done];
      setCreated(made);
      const reason = errorMessage(
        e,
        { NOT_A_PARENT: "보호자만 운동을 만들 수 있어요." },
        "등록하지 못했어요.",
      );
      setProblem(made.length > 0 ? `${made.length}회는 등록했어요. ${reason}` : reason);
    } finally {
      if (here.current) setSaving(false);
    }
  };

  if (sent) {
    return (
      <>
        <AppBar back title="직접 만들기" />
        <Stage wide>
          <div className="card-hero text-center" role="status">
            <p className="text-lead font-extrabold">루틴을 등록했어요</p>
            <p className="text-caption text-ink-soft mt-1 font-semibold">{sent}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <NavLink
                href="/parent"
                className="press bg-sub flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold"
              >
                홈으로
              </NavLink>
              <NavLink
                href="/calendar"
                className="press bg-signal-strong flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
              >
                캘린더 보기
              </NavLink>
            </div>
          </div>
        </Stage>
      </>
    );
  }

  // 탭 저장소를 읽기 전에는 빈 루틴이 아니라 기다리는 모양 — 「아직 없어요」 가 번쩍 뜨지 않게
  if (!ready) {
    return (
      <>
        <AppBar back title="직접 만들기" />
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
        <AppBar back title="직접 만들기" />
        <Stage wide>
          <EmptyState
            scene="no-mission"
            title="아직 담은 동작이 없어요"
            action={
              <NavLink
                href={childFinderHref(firstKid?.profileId)}
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
    created.length > 0 && pending.length > 0 ? `남은 ${pending.length}회 등록` : "루틴 등록";

  return (
    <>
      <AppBar back title="직접 만들기" />
      <Stage wide className="space-y-3 pb-36">
        {/* 1. 동작 — 하는 차례대로. 위아래로 옮기고 시간을 정한다 */}
        <Card hero>
          <CardHead
            title={`동작 ${moves.length}개, ${minutes}분`}
            meta={
              <button
                type="button"
                onClick={tidy}
                className="press text-signal-deep min-h-11 px-1 text-xs font-extrabold"
              >
                준비 → 본 → 정리로
              </button>
            }
          />
          <ol className="divide-rows mt-1">
            {moves.map((m, i) => (
              <li key={m.clip.clipId} className="py-3">
                {/* 첫 줄 — 차례, 썸네일, 이름, 빼기 */}
                <div className="flex items-center gap-2">
                  <span className="text-signal-deep w-6 shrink-0 text-center text-sm leading-snug font-extrabold tabular-nums">
                    {i + 1}
                  </span>
                  {/* 누르면 운동 상세(영상과 설명)로 */}
                  <Link
                    href={clipHref(m.clip)}
                    className="press flex min-w-0 flex-1 items-center gap-3"
                  >
                    <VideoThumb
                      videoId={m.clip.videoId}
                      src={m.clip.thumbnailUrl}
                      className="aspect-video w-24 shrink-0 rounded-xl"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm leading-snug font-extrabold">
                        {m.clip.title}
                      </span>
                      <span className="text-caption text-ink-soft block">
                        {PHASE_LABEL[m.clip.phase]} {m.minutes}분
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`${m.clip.title} 빼기`}
                    className="press text-ink-soft -mr-2 grid size-11 shrink-0 place-items-center"
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
                      className="press grid size-11 place-items-center disabled:opacity-30"
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
                      className="press grid size-11 place-items-center disabled:opacity-30"
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
                      className="press bg-sub grid size-11 place-items-center rounded-full disabled:opacity-30"
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => shift(i, 1)}
                      disabled={i === moves.length - 1}
                      aria-label={`${m.clip.title} 아래로`}
                      className="press bg-sub grid size-11 place-items-center rounded-full disabled:opacity-30"
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
              href={childFinderHref(firstKid?.profileId)}
              className="press text-signal-deep mt-1 flex min-h-11 items-center justify-center text-sm font-extrabold"
            >
              동작 더 담기
            </NavLink>
          )}
        </Card>

        {/* 2. 누가 — 아이 혼자 · 보호자와 같이 */}
        <Card>
          <CardHead title="누가 할까요" meta={`${chosen.length}명`} />
          {/* 가족을 못 받으면 고를 사람이 비어 보인다 — 비었다고 두지 않고 못 불러왔다고 */}
          {(sessionError ?? (family ? null : familyError)) && (
            <p className="text-ink-soft mt-2 flex items-center justify-between gap-3 text-sm">
              가족을 불러오지 못했어요
              <button
                type="button"
                onClick={() => void (sessionError ? refetchMe() : refetchFamily())}
                className="press text-signal-strong min-h-11 shrink-0 px-1 font-extrabold"
              >
                다시 불러오기
              </button>
            </p>
          )}
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

        {/* 3. 운동 요일과 기간. 처음에는 운동 루틴에 적은 요일이 골라져 있고, 그 요일에 점 */}
        <Card>
          <CardHead
            title="운동 요일"
            meta={weekdays.length > 0 ? `주 ${weekdays.length}일` : undefined}
          />
          <ul className="mt-3 grid grid-cols-7 gap-1.5">
            {WEEK.map((d) => {
              const on = weekdays.includes(d);
              const mine = free.includes(d);
              return (
                <li key={d}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${dayLabel(d)}요일${mine ? `, ${freeLabel}` : ""}`}
                    onClick={() => toggleWeekday(d)}
                    className={cn(
                      "press flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-sm font-extrabold",
                      on ? "bg-signal-strong text-white" : "bg-sub text-ink-soft",
                    )}
                  >
                    {dayLabel(d)}
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        mine ? (on ? "bg-white" : "bg-signal") : "bg-transparent",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {skippedRest > 0 && (
            <p className="text-caption text-ink-soft mt-2 font-semibold">
              쉬는 날 {skippedRest}일은 빼고 넣어요
            </p>
          )}
          <p className="text-caption text-ink-soft mt-2">
            {free.length > 0
              ? `점이 찍힌 요일은 ${freeLabel}이에요.`
              : "운동 루틴에 요일을 적어 두면 그 요일이 먼저 골라져요."}{" "}
            <NavLink href="/settings/schedule" className="text-signal-deep font-bold">
              {free.length > 0 ? "바꾸기" : "적으러 가기"}
            </NavLink>
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-sm font-bold">기간</p>
            <Segmented value={weeks} options={WEEKS} onChange={setWeeks} label="기간" />
          </div>
        </Card>
      </Stage>

      <Dock>
        <div className="card-hero py-3">
          {/* 루틴 한 줄. 「매주 월, 수, 금, 4주 동안(12회)」 */}
          <p className="text-center text-sm font-extrabold">{summary}</p>
          <p className="text-caption text-ink-soft mt-0.5 text-center font-semibold">
            {moves.length}개, {minutes}분,{" "}
            {/* 가족을 받는 동안은 「아무도 안 골랐어요」 가 아니다 */}
            {familyLoading
              ? "…"
              : people
                  .filter((p) => chosen.includes(p.profileId ?? ""))
                  .map((p) => p.name)
                  .join(", ") || "아무도 안 골랐어요"}
          </p>
          {problem && (
            <p role="alert" className="text-signal-deep mt-1 text-center text-sm font-semibold">
              {problem}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !chosenKid || pending.length === 0}
            data-off={!saving && (!chosenKid || pending.length === 0) ? "" : undefined}
            className="press bg-signal-strong data-off:bg-line data-off:text-ink-soft mt-2 flex min-h-14 w-full items-center justify-center rounded-2xl text-lg font-extrabold text-white disabled:opacity-100 data-off:shadow-none"
          >
            {saving ? "등록하는 중" : label}
          </button>
        </div>
      </Dock>
    </>
  );
}
