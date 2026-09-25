"use client";

import { Card, CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { DayRings } from "@/components/domain/day-rings";
import { StickerArt } from "@/components/domain/sticker-art";
import { useCalendar } from "@/lib/api/queries";
import { daySummary } from "@/lib/day";
import { stickerOf } from "@/lib/stickers";
import { daysBefore, monthGrid, monthOf, today, weekdayOf } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 아이 기록의 통계 — 전적 검색 사이트(op.gg · maple.gg)처럼 숫자 한 줄과 최근 기록 한 줄씩.
 * 9/22 「부모 단계에서도 통계를 한눈에 볼 수 있게」.
 *
 * 못 받은 것은 0 이 아니라 「—」 다. 0 을 그리면 안 한 달처럼 보인다.
 */

/**
 * 이번 달 숫자 — 운동한 날 · 움직인 시간 · 이어서 · 받은 칭찬. 한 카드 안에 선으로 나눈다.
 * 칭찬은 받은 달에만, 이어서는 이틀부터 칸을 둔다 — 「0장」 · 「0일째」 를 적어 두면 못 한 달이 된다
 * (규칙 12 · 캘린더 달 칸 · 아이 홈과 같게). 못 받았거나 받는 중이면 자리는 둔다.
 */
export function MonthStats({
  familyId,
  profileId,
  streak,
  streakState,
}: {
  familyId: string | undefined;
  profileId: string;
  /** 서버가 센 연속 — 끊긴 날을 세지 않는다 */
  streak: number | undefined;
  streakState: "pending" | "error" | "ready";
}) {
  const now = today();
  const month = monthGrid(monthOf(now));
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const {
    data,
    isLoading: isPending,
    error,
  } = useCalendar(familyId, profileId, {
    from: month.from,
    to: month.to,
  });
  const days = (data?.days ?? []).filter((d) => monthOf(d.date) === monthOf(now));
  const active = days.filter((d) => d.minutes > 0);
  const minutes = active.reduce((sum, d) => sum + d.minutes, 0);
  const stickers = days.reduce((sum, d) => sum + d.stickers.length, 0);
  const calendar: Load = error ? "error" : isPending ? "pending" : "ready";

  const cells: StatCell[] = [
    { key: "days", label: "이번 달 운동한 날", value: active.length, unit: "일", state: calendar },
    { key: "minutes", label: "움직인 시간", value: minutes, unit: "분", state: calendar },
  ];
  if ((streak ?? 0) >= 2 || streakState !== "ready") {
    cells.push({
      key: "streak",
      label: "이어서",
      value: streak ?? 0,
      unit: "일째",
      state: streakState,
    });
  }
  if (stickers > 0 || calendar !== "ready") {
    cells.push({
      key: "stickers",
      label: "받은 칭찬",
      value: stickers,
      unit: "장",
      state: calendar,
    });
  }

  return (
    <section aria-label="이번 달" className="card grid grid-cols-2 px-0 py-1">
      {cells.map(({ key, ...cell }, i) => (
        <Stat
          key={key}
          {...cell}
          left={i % 2 === 1}
          top={i >= 2}
          // 셋이면 아랫줄 하나가 폭을 다 쓴다 — 반쪽이 비어 보이지 않게
          wide={cells.length === 3 && i === 2}
        />
      ))}
    </section>
  );
}

type Load = "pending" | "error" | "ready";

interface StatCell {
  key: string;
  label: string;
  value: number;
  unit: string;
  state: Load;
}

function Stat({
  label,
  value,
  unit,
  state,
  left,
  top,
  wide,
}: {
  label: string;
  value: number;
  unit: string;
  state: "pending" | "error" | "ready";
  /** 왼쪽 칸과 나누는 선 */
  left?: boolean;
  /** 윗줄과 나누는 선 */
  top?: boolean;
  /** 두 칸 폭 */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-5 py-3.5",
        left && "border-line border-l",
        top && "border-line border-t",
        wide && "col-span-2",
      )}
    >
      <p className="metric-label">{label}</p>
      {state === "pending" ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : state === "error" ? (
        <p className="metric-value text-metric text-faint mt-1">—</p>
      ) : (
        <p className="metric-value text-metric mt-1">
          {value}
          <span className="metric-unit">{unit}</span>
        </p>
      )}
    </div>
  );
}

/** 최근 기록 — 움직인 날만 새것부터 일곱. 한 줄이 한 날, 누르면 그 아이의 그날 하루 기록 */
export function RecentDays({
  familyId,
  profileId,
}: {
  familyId: string | undefined;
  profileId: string;
}) {
  const now = today();
  // 여섯 주 — 캘린더가 한 번에 주는 만큼(42일). 스무 날만 보면 그 전에 한 아이도 「없어요」 가 됐다
  const {
    data,
    isLoading: isPending,
    error,
    refetch,
  } = useCalendar(familyId, profileId, {
    from: daysBefore(41),
    to: now,
  });
  const days = (data?.days ?? [])
    .filter((d) => d.minutes > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  return (
    <Card>
      <CardHead title="최근 기록" href={`/calendar?profileId=${encodeURIComponent(profileId)}`} />
      {isPending ? (
        <Skeleton className="mt-2 h-60 w-full rounded-2xl" />
      ) : error ? (
        <button
          type="button"
          onClick={() => void refetch()}
          className="press text-ink-soft mt-1 min-h-10 text-sm font-bold"
        >
          불러오지 못했어요 · 다시
        </button>
      ) : days.length === 0 ? (
        <p className="text-ink-soft mt-1 text-sm">최근 기록이 없어요</p>
      ) : (
        <ul className="divide-rows mt-1">
          {days.map((d) => {
            const s = daySummary(d);
            const [, m, day] = d.date.split("-").map(Number);
            const titles = d.entries.map((e) => e.title).join(" · ");
            const got = d.stickers[0] ? stickerOf(d.stickers[0].stickerId) : undefined;
            return (
              <li key={d.date}>
                <NavLink
                  href={`/calendar/${d.date}?profileId=${encodeURIComponent(profileId)}`}
                  className="press flex items-center gap-3 py-2.5"
                  aria-label={`${m}월 ${day}일 · ${titles} · ${d.minutes}분${got ? ` · ${got.label} 스티커` : ""}`}
                >
                  <span className="w-9 shrink-0 text-center leading-tight">
                    <span className="block text-base font-extrabold tabular-nums">{day}</span>
                    <span className="text-micro text-ink-soft block font-bold">
                      {d.date === now ? "오늘" : weekdayOf(d.date)}
                    </span>
                  </span>
                  <DayRings log={d} size={40} stroke={5} gap={2} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{titles}</span>
                    <span className="text-caption text-ink-soft block whitespace-nowrap tabular-nums">
                      {s.total > 0 ? `${s.done} / ${s.total}개` : ""}
                    </span>
                  </span>
                  <span className="w-12 shrink-0 text-right text-base font-extrabold tabular-nums">
                    {d.minutes}
                    <span className="text-ink-soft text-caption ml-0.5 font-bold">분</span>
                  </span>
                  {/* 스티커 자리는 늘 비워 둔다 — 있는 줄 · 없는 줄의 분이 한 세로줄에 서게 */}
                  <span className="size-8 shrink-0">
                    {d.stickers[0] && (
                      <StickerArt id={d.stickers[0].stickerId} className="size-8" />
                    )}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
