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
import { DayRings } from "@/components/domain/day-rings";
import { StickerArt } from "@/components/domain/sticker-art";
import type { DayLog } from "@/lib/api/types";
import { useCalendar, useFitnessMap, useMissions } from "@/lib/api/queries";
import { daySummary, plannedDay } from "@/lib/day";
import { useSession } from "@/lib/session";
import { stickerOf } from "@/lib/stickers";
import { longDate, monthGrid, monthLabel, monthOf, shiftMonth, today } from "@/lib/today";
import { cn } from "@/lib/utils";
import { useIsKidView } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";

/**
 * 캘린더 — 부모와 아이가 같이 본다.
 *
 * 한 달이 작은 링으로 찬다(애플 피트니스의 달력처럼). 링은 하루 기록과 같은 둘 — 움직인 시간 · 끝낸 운동.
 * 받은 스티커는 그날 칸 모서리에 붙는다. **날을 누르면 그날의 하루 기록**(`/calendar/[날짜]`)으로 간다.
 * 달 아래에는 그 달을 칸 셋으로 — 운동한 날 · 움직인 시간 · 받은 칭찬(아이 기록과 같은 이름).
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
  const { familyId, isPending, error: sessionError, refetch: refetchMe } = useSession();
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const { data: map, isLoading: mapLoading, error: mapError, refetch } = useFitnessMap(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);

  const kids = (map?.members ?? []).filter((m) => m.role === "CHILD");
  // 아이 기록 · 하루 기록에서 올 때는 그 아이(`?profileId=`)가 먼저다. 아이 화면은 자기 것만
  const asked = kidView ? null : params.get("profileId");
  const who =
    kids.find((k) => k.profileId === asked) ??
    kids.find((k) => k.profileId === childProfileId) ??
    (kidView ? undefined : kids[0]);
  const suffix = asked && asked === who?.profileId ? `?profileId=${encodeURIComponent(asked)}` : "";

  const now = today();
  // 주소창 값은 믿지 않는다 — 모양이 틀리면 이번 달로
  const askedMonth = params.get("month");
  const month =
    askedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(askedMonth) ? askedMonth : monthOf(now);
  const grid = monthGrid(month);

  const {
    data: calendar,
    isPending: calendarPending,
    error: calendarError,
    refetch: refetchCalendar,
  } = useCalendar(familyId, who?.profileId ?? undefined, { from: grid.from, to: grid.to });
  const logs = new Map((calendar?.days ?? []).map((d) => [d.date, d]));
  // 앞으로 잡힌 운동 — 이 아이가 하는 것만. 걸음수는 넣지 않는다(규칙 2). 하루 기록과 같은 목록(ALL)을 쓴다
  const { data: missions } = useMissions(familyId, { scope: "ALL" });
  const planned = new Set(
    (missions?.missions ?? [])
      .filter((m) => m.participants?.some((p) => p.profileId === who?.profileId))
      .map((m) => plannedDay(m, now))
      .filter((d): d is string => Boolean(d)),
  );

  const go = (next: string) =>
    router.replace(`/calendar?month=${next}${suffix ? `&${suffix.slice(1)}` : ""}`, {
      scroll: false,
    });

  const back = kidView ? "/kid" : "/parent";
  const failure = sessionError ?? (map ? null : mapError);
  if (failure) {
    return (
      <>
        <AppBar backHref={back} title="캘린더" />
        <Stage wide>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
          />
        </Stage>
      </>
    );
  }
  if (isPending || mapLoading) return <CalendarSkeleton />;

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
  const tileState = calendarError ? "error" : calendarPending ? "pending" : "ready";

  return (
    <>
      {/* 부모는 누구의 달인지 제목에서 안다 — 아이가 하나면 고르는 칩이 없다 */}
      <AppBar backHref={back} title={kidView ? "캘린더" : `${who.name ?? "아이"}의 캘린더`} />
      <Stage wide className="space-y-3">
        {!kidView && (
          <ChildSwitch
            kids={kids}
            selectedId={who?.profileId}
            onSelect={(id) => {
              setChild(id);
              router.replace(`/calendar?month=${month}&profileId=${encodeURIComponent(id)}`, {
                scroll: false,
              });
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
                    // 쉬기로 한 날에는 운동이 잡혀 있어도 점선 고리를 두지 않는다(규칙 15)
                    planned={planned.has(date) && !logs.get(date)?.rest}
                    future={date > now}
                    isToday={date === now}
                    loading={calendarPending}
                    onPick={() => router.push(`/calendar/${date}${suffix}`)}
                  />
                )}
              </li>
            ))}
          </ol>
          {/* 링 둘이 무엇인지 글로 — 색만으로 가르지 않는다. 하루 기록의 링과 같은 둘이다 */}
          <ul
            className="text-caption text-ink-soft mt-3 flex justify-center gap-4 font-semibold"
            aria-hidden
          >
            <li className="flex items-center gap-1.5">
              <span className="bg-signal size-2 rounded-full" />
              움직인 시간
            </li>
            <li className="flex items-center gap-1.5">
              <span className="bg-mark size-2 rounded-full" />
              끝낸 운동
            </li>
            {/* 쉬는 날을 쓴 달에만 — 없는 것을 범례에 두면 찾게 된다 */}
            {[...logs.values()].some((d) => d.rest && monthOf(d.date) === month) && (
              <li className="flex items-center gap-1.5">
                <span className="bg-mark-soft ring-mark size-2.5 rounded-full ring-1" />
                쉬는 날
              </li>
            )}
          </ul>

          {/* 이 달 — 칸 셋(칭찬을 받은 달) · 둘. 둥근 회색 면 없이 선으로 나눈다(이번 주 칸과 같다) */}
          <div className="divide-line border-line mt-4 grid auto-cols-fr grid-flow-col divide-x border-t pt-4">
            <MonthTile label="운동한 날" value={days.length} unit="일" state={tileState} />
            <MonthTile label="움직인 시간" value={total} unit="분" state={tileState} />
            {/* 칭찬은 받은 달에만 칸으로 — 0장을 적어 두면 못 받은 달이 된다(규칙 12) */}
            {(stickers > 0 || tileState !== "ready") && (
              <MonthTile label="받은 칭찬" value={stickers} unit="장" state={tileState} />
            )}
          </div>
          {calendarError && (
            <button
              type="button"
              onClick={() => void refetchCalendar()}
              className="press text-ink-soft mt-3 min-h-10 w-full text-sm font-bold"
            >
              기록을 불러오지 못했어요 · 다시
            </button>
          )}
        </section>
      </Stage>
    </>
  );
}

/** 날 한 칸. 움직인 날은 하루 기록과 같은 링 둘(가운데에 날짜), 받은 스티커는 모서리에 */
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
  const rest = Boolean(log?.rest);
  const summary = daySummary(log);
  const sticker = log?.stickers[0] ? stickerOf(log.stickers[0].stickerId) : undefined;
  const size = 38;
  const stroke = 4;
  const r = (size - stroke) / 2;

  return (
    <button
      type="button"
      onClick={onPick}
      // 앞날은 운동을 잡아 둔 날만 연다 — 하루 기록도 앞날은 잡아 둔 날만 간다. 쉬는 날은 흐리지 않고 칠만 한다
      disabled={future && !planned}
      // 링 둘이 말하는 것을 다 읽어 준다 — 범례는 화면 읽기에서 숨어 있다
      aria-label={`${longDate(date)}${rest ? " · 쉬는 날" : ""}${moved ? ` · 움직인 시간 ${moved.minutes}분 · 끝낸 운동 ${summary.done}개` : ""}${sticker ? ` · ${sticker.label} 스티커` : ""}${planned && !moved ? " · 운동 잡혀 있음" : ""}`}
      className={cn(
        "press relative grid size-11 place-items-center rounded-full",
        isToday && "bg-signal-soft",
        // 쉬는 날 카드를 쓴 날 — 빈 날이 아니라 「쉬기로 한 날」. 노랑 옅은 면으로
        rest && !moved && "bg-mark-soft",
        future && !planned && !rest && "opacity-40",
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
      {moved && <DayRings log={moved} size={40} stroke={3.5} gap={1} className="absolute" />}
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

/** 이 달 한 칸. 못 받은 것은 0 이 아니라 「—」 — 0 을 그리면 안 한 달처럼 보인다 */
function MonthTile({
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
          {state === "error" ? "—" : 0}
        </p>
      )}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <>
      {/* 기다리는 동안에도 나갈 길 — 뒤로(기록이 없으면 첫 화면) */}
      <AppBar back title="캘린더" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-[30rem] w-full rounded-3xl" />
      </Stage>
    </>
  );
}
