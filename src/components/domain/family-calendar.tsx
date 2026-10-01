"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { ProfileAvatar } from "@/components/domain/profile-avatar";
import type { DayLog, FitnessMapMember } from "@/lib/api/types";
import { useFamilyCalendars } from "@/lib/api/queries";
import { didSomething } from "@/lib/day";
import { longDate, monthGrid, monthLabel, monthOf, shiftMonth, today } from "@/lib/today";
import { cn } from "@/lib/utils";

const WEEK_HEAD = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * 사람마다 정해진 색. 나 먼저, 다른 보호자, 아이 차례로 하나씩 받는다.
 * 보라와 형광은 쓰지 않는다(globals.css 의 색 규칙). 여섯째부터는 처음 색으로 돈다
 */
const PERSON_COLORS = [
  "var(--color-signal)",
  "var(--color-done)",
  "var(--color-mark-shade)",
  "var(--color-signal-deep)",
  "var(--color-baseline)",
];

/**
 * 가족 통합 캘린더. 아이와 보호자 모두의 한 달 운동을 한 달력에 모은다.
 *
 * 날 칸마다 그날 운동한 사람이 그 사람 색 점으로 선다. 쉬는 날은 캘린더처럼 노랑 옅은 면이다.
 * 달력 아래에 사람별 색 범례, 이 달 가족이 운동한 날과 운동 시간을 둔다.
 * 날을 누르면 달력 아래에 그날 누가 무엇을 했는지 펼친다(하루 기록 화면은 아이 한 명 기준이라서).
 */
export function FamilyCalendar({
  familyId,
  people,
}: {
  familyId: string | undefined;
  /** 달력에 올릴 사람. 이 차례대로 색을 받는다 */
  people: FitnessMapMember[];
}) {
  const now = today();
  const [month, setMonth] = useState(() => monthOf(now));
  // 고른 날. 처음에는 오늘
  const [picked, setPicked] = useState<string | null>(now);
  const grid = monthGrid(month);

  const ids = people.map((p) => p.profileId ?? "").filter(Boolean);
  const calendars = useFamilyCalendars(familyId, ids, { from: grid.from, to: grid.to });
  // 받은 차례가 아니라 아이디로 잇는다. 아이디 없는 사람이 끼면 기록이 옆 사람에게 붙는다
  const logsOf = (profileId: string | null | undefined) => {
    const q = profileId ? calendars[ids.indexOf(profileId)] : undefined;
    return new Map((q?.data?.days ?? []).map((d) => [d.date, d]));
  };
  const byPerson = people.map((p, i) => ({
    person: p,
    color: PERSON_COLORS[i % PERSON_COLORS.length],
    logs: logsOf(p.profileId),
  }));

  const moved = (log: DayLog | undefined) =>
    Boolean(log && (log.minutes > 0 || log.entries.some(didSomething)));
  const movedOn = (date: string) => byPerson.filter((b) => moved(b.logs.get(date)));
  // 쉬는 날 카드는 가족 단위다. 누구 기록에든 실려 오면 그날은 쉬기로 한 날
  const restOn = (date: string) => byPerson.some((b) => b.logs.get(date)?.rest);

  const pending = calendars.some((q) => q.isPending);
  const failed = calendars.filter((q) => q.error && !q.data);
  const state = failed.length > 0 ? "error" : pending ? "pending" : "ready";

  const monthDays = grid.cells.filter((d): d is string => Boolean(d) && monthOf(d ?? "") === month);
  const activeDays = monthDays.filter((d) => movedOn(d).length > 0).length;
  const minutes = byPerson.reduce(
    (sum, b) =>
      sum +
      [...b.logs.values()]
        .filter((d) => monthOf(d.date) === month)
        .reduce((s, d) => s + d.minutes, 0),
    0,
  );
  const anyRest = monthDays.some(restOn);

  const go = (by: number) => {
    const next = shiftMonth(month, by);
    setMonth(next);
    // 이번 달로 돌아오면 오늘을 다시 고른다. 다른 달은 고른 날 없이 연다
    setPicked(next === monthOf(now) ? now : null);
  };

  const pickedDay = picked && monthOf(picked) === month ? picked : null;

  return (
    <section className="card-hero" aria-label="가족 캘린더">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={month <= "2020-01"}
          aria-label="지난달"
          className="press text-ink-soft grid size-11 place-items-center rounded-full disabled:opacity-30"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <h2 className="text-lead font-extrabold">{monthLabel(month)}</h2>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={month >= monthOf(now)}
          aria-label="다음 달"
          className="press text-ink-soft grid size-11 place-items-center rounded-full disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center" aria-hidden>
        {WEEK_HEAD.map((d) => (
          <span key={d} className="text-micro text-faint font-bold">
            {d}
          </span>
        ))}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-y-1.5">
        {grid.cells.map((date, i) => {
          if (!date) return <li key={`pad-${i}`} />;
          const who = movedOn(date);
          const rest = restOn(date);
          const future = date > now;
          const isToday = date === now;
          const isPicked = date === pickedDay;
          return (
            <li key={date} className="grid place-items-center">
              <button
                type="button"
                onClick={() => setPicked(isPicked ? null : date)}
                disabled={future}
                aria-pressed={isPicked}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${longDate(date)}${rest ? ", 쉬는 날" : ""}${who.length > 0 ? `, ${who.map((b) => b.person.name ?? "").join(", ")} 운동함` : ""}`}
                className={cn(
                  "press relative flex size-11 flex-col items-center justify-center gap-0.5 rounded-full",
                  isToday && "bg-signal-soft",
                  // 쉬는 날 카드를 쓴 날. 빈 날이 아니라 쉬기로 한 날이라 노랑 옅은 면으로
                  rest && who.length === 0 && !isToday && "bg-mark-soft",
                  isPicked && "ring-signal ring-2",
                  future && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "text-sm leading-none tabular-nums",
                    isToday
                      ? "text-signal-deep font-extrabold"
                      : who.length > 0
                        ? "font-bold"
                        : "text-ink-soft",
                    pending && "opacity-50",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                  {who.map((b) => (
                    <span
                      key={b.person.profileId}
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* 사람별 색. 색만으로 가르지 않게 이름을 같이 쓴다 */}
      <ul className="text-caption text-ink-soft mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 font-semibold">
        {byPerson.map((b) => (
          <li key={b.person.profileId} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: b.color }}
            />
            {b.person.name}
          </li>
        ))}
        {anyRest && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="bg-mark-soft ring-mark size-2.5 rounded-full ring-1" />
            쉬는 날
          </li>
        )}
      </ul>

      <div className="divide-line border-line mt-4 grid grid-cols-2 divide-x border-t pt-4">
        <Tile label="가족이 운동한 날" value={activeDays} unit="일" state={state} />
        <Tile label="가족 운동 시간" value={minutes} unit="분" state={state} />
      </div>
      {state === "error" && (
        <button
          type="button"
          onClick={() => failed.forEach((q) => void q.refetch())}
          className="press text-ink-soft mt-3 min-h-11 w-full text-sm font-bold"
        >
          기록을 불러오지 못했어요. 누르면 다시 불러와요
        </button>
      )}

      {pickedDay && (
        <DayDetail
          date={pickedDay}
          rest={restOn(pickedDay)}
          rows={byPerson
            .map((b) => ({ ...b, log: b.logs.get(pickedDay) }))
            .filter((b) => moved(b.log))}
          loading={pending}
        />
      )}
    </section>
  );
}

/** 고른 날 하루. 그날 운동한 사람마다 무엇을 몇 분 했는지 */
function DayDetail({
  date,
  rest,
  rows,
  loading,
}: {
  date: string;
  rest: boolean;
  rows: { person: FitnessMapMember; color: string; log: DayLog | undefined }[];
  loading: boolean;
}) {
  return (
    <div className="border-line mt-4 border-t pt-4" aria-live="polite">
      <p className="text-body font-extrabold">{longDate(date)}</p>
      {rest && <p className="text-caption text-ink-soft mt-0.5 font-semibold">쉬는 날이에요</p>}
      {rows.length === 0 ? (
        !rest && (
          <p className="text-caption text-ink-soft mt-2 font-semibold">
            {loading ? "기록을 불러오고 있어요" : "이날은 운동 기록이 없어요"}
          </p>
        )
      ) : (
        <ul className="divide-rows mt-1">
          {rows.map(({ person, color, log }) => {
            const entries = (log?.entries ?? []).filter(didSomething);
            return (
              <li key={person.profileId} className="flex gap-3 py-3">
                <span className="relative shrink-0">
                  <ProfileAvatar
                    profileId={person.profileId}
                    name={person.name}
                    tone={person.role === "CHILD" ? "signal" : "mark"}
                    size="sm"
                  />
                  <span
                    aria-hidden
                    className="ring-paper absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2"
                    style={{ backgroundColor: color }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-extrabold">{person.name}</span>
                    {log && log.minutes > 0 && (
                      <span className="text-caption text-ink-soft shrink-0 font-bold tabular-nums">
                        {log.minutes}분
                      </span>
                    )}
                  </span>
                  {entries.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {entries.map((e) => (
                        <li
                          key={e.missionId}
                          className="text-caption text-ink-soft flex items-center gap-1 font-semibold"
                        >
                          {e.completed && (
                            <Check aria-hidden className="text-done size-3.5 shrink-0" />
                          )}
                          <span className="truncate">{e.title}</span>
                          {e.minutes > 0 && (
                            <span className="text-faint shrink-0 tabular-nums">{e.minutes}분</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 이 달 한 칸. 못 받은 것은 0 이 아니라 「?」. 0 을 그리면 안 한 달처럼 보인다 */
function Tile({
  label,
  value,
  unit,
  state,
}: {
  label: string;
  value: number;
  unit: string;
  state: "pending" | "error" | "ready";
}) {
  return (
    <div className="px-2 text-center">
      <p className="text-micro text-ink-soft font-bold">{label}</p>
      {state === "ready" ? (
        <p className="metric-value mt-1 text-2xl">
          {value}
          <span className="metric-unit">{unit}</span>
        </p>
      ) : (
        <p
          className={cn(
            "metric-value text-faint mt-1 text-2xl",
            state === "pending" && "opacity-40",
          )}
        >
          {state === "error" ? (
            <>
              <span aria-hidden="true">?</span>
              <span className="sr-only">불러오지 못했어요</span>
            </>
          ) : (
            0
          )}
        </p>
      )}
    </div>
  );
}
