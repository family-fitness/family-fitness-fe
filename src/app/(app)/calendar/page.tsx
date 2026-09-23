"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSwitch } from "@/components/domain/child-switch";
import { StickerArt } from "@/components/domain/sticker-art";
import type { DayLog } from "@/lib/api/types";
import { useCalendar, useFitnessMap } from "@/lib/api/queries";
import { VERIFIED_COPY } from "@/lib/mission";
import { PHASE_LABEL } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { stickerOf } from "@/lib/stickers";
import { longDate, monthGrid, monthLabel, monthOf, shiftMonth, today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";
import { useIsKidView } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";

/**
 * 캘린더 — 부모와 아이가 같이 본다.
 *
 * 한 달이 작은 링으로 찬다(애플 피트니스의 달력처럼). 링은 그날 잡힌 시간 대비 움직인 시간.
 * 받은 스티커는 그날 칸 모서리에 붙는다. 날을 누르면 아래에 그날 한 것과 받은 말이 나온다.
 *
 * **아무것도 안 한 날은 빈 칸이다.** 「빠진 날」 이라고 쓰지 않는다 — 쉰 날은 쉰 날이다.
 * 부모는 아이를 골라 보고, 아이는 자기 것만 본다. 달과 날은 주소에 둔다(`?month=&date=`).
 */
export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <Calendar />
    </Suspense>
  );
}

const WEEK_HEAD = ["월", "화", "수", "목", "금", "토", "일"];

function Calendar() {
  const router = useRouter();
  const params = useSearchParams();
  const kidView = useIsKidView();
  const { familyId, isPending, error: sessionError } = useSession();
  const { data: map, isPending: mapPending, error: mapError, refetch } = useFitnessMap(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);

  const kids = (map?.members ?? []).filter((m) => m.role === "CHILD");
  const who = kids.find((k) => k.profileId === childProfileId) ?? (kidView ? undefined : kids[0]);

  const now = today();
  const month = params.get("month") ?? monthOf(now);
  const grid = monthGrid(month);
  const selected = params.get("date") ?? (month === monthOf(now) ? now : null);

  const { data: calendar, isPending: calendarPending } = useCalendar(
    familyId,
    who?.profileId ?? undefined,
    { from: grid.from, to: grid.to },
  );
  const logs = new Map((calendar?.days ?? []).map((d) => [d.date, d]));

  const go = (next: { month?: string; date?: string | null }) => {
    const q = new URLSearchParams();
    q.set("month", next.month ?? month);
    const date = next.date === undefined ? selected : next.date;
    if (date) q.set("date", date);
    router.replace(`/calendar?${q}`, { scroll: false });
  };

  const back = kidView ? "/kid" : "/parent";
  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar backHref={back} title="캘린더" />
        <Stage wide>
          <ErrorState error={failure} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }
  if (isPending || mapPending) return <CalendarSkeleton />;

  const days = [...logs.values()].filter((d) => d.minutes > 0);
  const total = days.reduce((sum, d) => sum + d.minutes, 0);
  const log = selected ? logs.get(selected) : undefined;
  const name = who?.name ?? "아이";

  return (
    <>
      <AppBar backHref={back} title="캘린더" />
      <Stage wide className="space-y-3">
        {!kidView && (
          <ChildSwitch
            kids={kids}
            selectedId={who?.profileId}
            onSelect={(id) => {
              setChild(id);
            }}
          />
        )}

        <section className="card-hero">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => go({ month: shiftMonth(month, -1), date: null })}
              aria-label="지난달"
              className="press text-ink-soft grid size-11 place-items-center rounded-full"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <h2 className="text-lead font-extrabold">{monthLabel(month)}</h2>
            <button
              type="button"
              onClick={() => go({ month: shiftMonth(month, 1), date: null })}
              disabled={month >= monthOf(now)}
              aria-label="다음 달"
              className="press text-ink-soft grid size-11 place-items-center rounded-full disabled:opacity-30"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>

          <p className="text-caption text-ink-soft mt-1 text-center font-semibold">
            {calendarPending
              ? " "
              : days.length > 0
                ? `${withJosa(name, "이가")} 움직인 날 ${days.length}일 · 모두 ${total}분`
                : "이 달에는 아직 기록이 없어요"}
          </p>

          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center" aria-hidden>
            {WEEK_HEAD.map((d) => (
              <span key={d} className="text-micro text-faint font-bold">
                {d}
              </span>
            ))}
          </div>
          <ol className="mt-1 grid grid-cols-7 gap-y-1.5">
            {grid.cells.map((date, i) => (
              <li key={date ?? `pad-${i}`} className="grid place-items-center">
                {date && (
                  <DayCell
                    date={date}
                    log={logs.get(date)}
                    on={date === selected}
                    future={date > now}
                    isToday={date === now}
                    loading={calendarPending}
                    onPick={() => go({ date })}
                  />
                )}
              </li>
            ))}
          </ol>
        </section>

        {selected && (
          <DayDetail
            date={selected}
            log={log}
            loading={calendarPending}
            future={selected > now}
            stickerHref={
              !kidView && selected === now && who?.profileId
                ? `/parent/sticker/${who.profileId}`
                : null
            }
          />
        )}
      </Stage>
    </>
  );
}

/** 날 한 칸. 움직인 날은 작은 링, 받은 스티커는 모서리에 */
function DayCell({
  date,
  log,
  on,
  future,
  isToday,
  loading,
  onPick,
}: {
  date: string;
  log: DayLog | undefined;
  on: boolean;
  future: boolean;
  isToday: boolean;
  loading: boolean;
  onPick: () => void;
}) {
  const day = Number(date.slice(8));
  const moved = log && log.minutes > 0 ? log : undefined;
  const sticker = log?.stickers[0] ? stickerOf(log.stickers[0].stickerId) : undefined;
  const size = 38;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = moved ? Math.min(1, moved.minutes / (moved.plannedMinutes || moved.minutes)) : 0;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={future}
      aria-pressed={on}
      aria-label={`${longDate(date)}${moved ? ` · ${moved.minutes}분` : ""}${sticker ? ` · ${sticker.label} 스티커` : ""}`}
      className={cn(
        "press relative grid size-11 place-items-center rounded-full",
        on && "bg-signal-soft",
        future && "opacity-40",
      )}
    >
      {moved && (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute -rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-signal-soft)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
          />
        </svg>
      )}
      <span
        className={cn(
          "relative text-sm tabular-nums",
          isToday ? "text-signal-strong font-extrabold" : moved ? "font-bold" : "text-ink-soft",
          loading && "opacity-50",
        )}
      >
        {day}
      </span>
      {sticker && <StickerArt id={sticker.id} className="absolute -top-0.5 -right-0.5 size-4" />}
    </button>
  );
}

/** 고른 날 — 한 것과 받은 말 */
function DayDetail({
  date,
  log,
  loading,
  future,
  stickerHref,
}: {
  date: string;
  log: DayLog | undefined;
  loading: boolean;
  future: boolean;
  /** 부모 · 오늘 · 아직 스티커가 없을 때만 */
  stickerHref: string | null;
}) {
  if (loading) return <Skeleton className="h-40 w-full rounded-3xl" />;

  const moved = log && log.minutes > 0;
  return (
    <Card>
      <CardHead title={longDate(date)} meta={moved ? `${log.minutes}분` : undefined} />

      {!moved && (
        <p className="text-ink-soft mt-1 text-sm">
          {future ? "아직 오지 않은 날이에요" : "이날은 쉬었어요"}
        </p>
      )}

      {moved &&
        log.entries.map((entry) => (
          <div key={entry.missionId} className="border-line mt-3 border-t pt-3 first:border-0">
            <p className="text-sm font-extrabold">{entry.title}</p>
            {entry.sessions && entry.sessions.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {entry.sessions.map((s, i) => (
                  <li key={i} className="text-caption flex gap-2">
                    <span className="text-ink-soft w-11 shrink-0 font-bold">
                      {PHASE_LABEL[s.phase].replace("운동", "")}
                    </span>
                    <span className={cn("min-w-0 flex-1", !s.done && "text-faint")}>{s.title}</span>
                    {s.minutes != null && (
                      <span className="text-ink-soft shrink-0 tabular-nums">{s.minutes}분</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {entry.verifiedBy && (
              <p className="text-micro text-ink-soft mt-1.5 font-semibold">
                {VERIFIED_COPY[entry.verifiedBy]}
              </p>
            )}
          </div>
        ))}

      {log?.stickers.map((st) => {
        const sticker = stickerOf(st.stickerId);
        return (
          <div key={st.cheerId} className="bg-sub mt-3 flex items-center gap-3 rounded-2xl p-3">
            <StickerArt id={st.stickerId} className="size-12 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold">{st.message || sticker?.label || "칭찬"}</p>
              <p className="text-micro text-ink-soft mt-0.5 font-semibold">{st.fromName}</p>
            </div>
          </div>
        );
      })}

      {stickerHref && moved && (log?.stickers.length ?? 0) === 0 && (
        <NavLink
          href={stickerHref}
          className="press bg-signal-strong mt-3 flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
        >
          칭찬 스티커 붙이기
        </NavLink>
      )}
    </Card>
  );
}

function CalendarSkeleton() {
  return (
    <>
      <AppBar title="캘린더" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-96 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
