"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ChildSwitch } from "@/components/domain/child-switch";
import { StickerArt } from "@/components/domain/sticker-art";
import type { DayLog } from "@/lib/api/types";
import { useCalendar, useFitnessMap, useMissions } from "@/lib/api/queries";
import { plannedDay } from "@/lib/day";
import { useSession } from "@/lib/session";
import { stickerOf } from "@/lib/stickers";
import { longDate, monthGrid, monthLabel, monthOf, shiftMonth, today } from "@/lib/today";
import { cn } from "@/lib/utils";
import { useIsKidView } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";

/**
 * 캘린더 — 부모와 아이가 같이 본다.
 *
 * 한 달이 작은 링으로 찬다(애플 피트니스의 달력처럼). 링은 그날 잡힌 시간 대비 움직인 시간.
 * 받은 스티커는 그날 칸 모서리에 붙는다. **날을 누르면 그날의 하루 기록**(`/calendar/[날짜]`)으로 간다.
 * 달 아래에는 그 달을 칸 셋으로 — 움직인 날 · 모두 몇 분 · 받은 칭찬.
 *
 * **아무것도 안 한 날은 빈 칸이다.** 「빠진 날」 이라고 쓰지 않는다 — 쉰 날은 쉰 날이다.
 * 부모는 아이를 골라 보고, 아이는 자기 것만 본다. 달은 주소에 둔다(`?month=`).
 *
 * **앞으로의 날에는 잡아 둔 운동이 점선 고리로 보인다** — 직접 짜기에서 여러 날에 넣은 것.
 * 다음 달까지만 넘겨 본다.
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
  // 주소창 값은 믿지 않는다 — 모양이 틀리면 이번 달로.
  // 예전 알림은 날짜만 싣고 온다(`?date=`). 그 날짜가 든 달을 연다
  const askedMonth = params.get("month");
  const askedDate = params.get("date");
  const validDate = askedDate && /^\d{4}-\d{2}-\d{2}$/.test(askedDate) ? askedDate : null;
  const month =
    askedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(askedMonth)
      ? askedMonth
      : validDate
        ? monthOf(validDate)
        : monthOf(now);
  const grid = monthGrid(month);

  const { data: calendar, isPending: calendarPending } = useCalendar(
    familyId,
    who?.profileId ?? undefined,
    { from: grid.from, to: grid.to },
  );
  const logs = new Map((calendar?.days ?? []).map((d) => [d.date, d]));
  // 앞으로 잡힌 운동 — 이 아이가 하는 것만. 걸음수는 넣지 않는다(규칙 2)
  const { data: active } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });
  const planned = new Set(
    (active?.missions ?? [])
      .filter((m) => m.participants?.some((p) => p.profileId === who?.profileId))
      .map((m) => plannedDay(m, now))
      .filter((d): d is string => Boolean(d)),
  );

  const go = (next: string) => router.replace(`/calendar?month=${next}`, { scroll: false });

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

  // 볼 아이가 없다 — 빈 달력을 기다리게 두지 않는다
  if (!who) {
    return (
      <>
        <AppBar backHref={back} title="캘린더" />
        <Stage wide>
          <EmptyState
            scene="no-record"
            title={kidView ? "누구인지 골라 주세요" : "아이를 등록해 주세요"}
            action={
              <NavLink
                href={kidView ? "/start" : "/start/child"}
                className="press bg-signal-strong mt-2 flex min-h-12 items-center rounded-2xl px-6 text-sm font-extrabold text-white"
              >
                {kidView ? "고르러 가기" : "아이 등록하기"}
              </NavLink>
            }
          />
        </Stage>
      </>
    );
  }

  const days = [...logs.values()].filter((d) => d.minutes > 0 && monthOf(d.date) === month);
  const total = days.reduce((sum, d) => sum + d.minutes, 0);
  const stickers = [...logs.values()]
    .filter((d) => monthOf(d.date) === month)
    .reduce((sum, d) => sum + d.stickers.length, 0);

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
              onClick={() => go(shiftMonth(month, -1))}
              aria-label="지난달"
              className="press text-ink-soft grid size-11 place-items-center rounded-full"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <h2 className="text-lead font-extrabold">{monthLabel(month)}</h2>
            <button
              type="button"
              onClick={() => go(shiftMonth(month, 1))}
              disabled={month >= shiftMonth(monthOf(now), 1)}
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
            {grid.cells.map((date, i) => (
              <li key={date ?? `pad-${i}`} className="grid place-items-center">
                {date && (
                  <DayCell
                    date={date}
                    log={logs.get(date)}
                    planned={planned.has(date)}
                    future={date > now}
                    isToday={date === now}
                    loading={calendarPending}
                    onPick={() => router.push(`/calendar/${date}`)}
                  />
                )}
              </li>
            ))}
          </ol>

          {/* 이 달 — 칸 셋 */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MonthTile label="움직인 날" value={days.length} unit="일" loading={calendarPending} />
            <MonthTile label="모두" value={total} unit="분" loading={calendarPending} />
            <MonthTile label="받은 칭찬" value={stickers} unit="장" loading={calendarPending} />
          </div>
        </section>
      </Stage>
    </>
  );
}

/** 날 한 칸. 움직인 날은 작은 링, 받은 스티커는 모서리에 */
function DayCell({
  date,
  log,
  planned,
  future,
  isToday,
  loading,
  onPick,
}: {
  date: string;
  log: DayLog | undefined;
  /** 잡아 둔 운동이 있다 — 점선 고리 */
  planned: boolean;
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
      disabled={future && !planned}
      aria-label={`${longDate(date)}${moved ? ` · ${moved.minutes}분` : ""}${sticker ? ` · ${sticker.label} 스티커` : ""}${planned && !moved ? " · 운동 잡혀 있음" : ""}`}
      className={cn(
        "press relative grid size-11 place-items-center rounded-full",
        isToday && "bg-signal-soft",
        future && !planned && "opacity-40",
      )}
    >
      {planned && !moved && (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth={2}
            strokeDasharray="3 3"
          />
        </svg>
      )}
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
          // 오늘은 남색 — 고른 칸의 연한 파랑 위에서도 읽힌다(파랑은 4.4:1 로 모자랐다)
          isToday ? "text-signal-deep font-extrabold" : moved ? "font-bold" : "text-ink-soft",
          loading && "opacity-50",
        )}
      >
        {day}
      </span>
      {sticker && <StickerArt id={sticker.id} className="absolute -top-0.5 -right-0.5 size-4" />}
    </button>
  );
}

/** 이 달 한 칸 */
function MonthTile({
  label,
  value,
  unit,
  loading,
}: {
  label: string;
  value: number;
  unit: string;
  loading: boolean;
}) {
  return (
    <div className="bg-sub rounded-2xl px-2 py-3 text-center">
      <p className="text-micro text-ink-soft font-bold">{label}</p>
      <p className={cn("metric-value mt-1 text-2xl", loading && "opacity-40")}>
        {loading ? 0 : value}
        <span className="metric-unit">{unit}</span>
      </p>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <>
      <AppBar title="캘린더" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-[30rem] w-full rounded-3xl" />
      </Stage>
    </>
  );
}
