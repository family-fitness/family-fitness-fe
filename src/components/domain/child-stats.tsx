"use client";

import { Card, CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { DayRings } from "@/components/domain/day-rings";
import { StickerArt } from "@/components/domain/sticker-art";
import { useCalendar } from "@/lib/api/queries";
import { daySummary } from "@/lib/day";
import { daysBefore, monthGrid, monthOf, today, weekdayOf } from "@/lib/today";

/**
 * 아이 기록의 통계 — 전적 검색 사이트(op.gg · maple.gg)처럼 숫자 칸과 최근 기록 한 줄씩.
 * 9/22 「부모 단계에서도 통계를 한눈에 볼 수 있게」.
 */

/** 이번 달 칸 넷 — 운동한 날 · 움직인 시간 · 이어서 · 받은 칭찬 */
export function MonthStats({
  familyId,
  profileId,
  streak,
}: {
  familyId: string | undefined;
  profileId: string;
  /** 서버가 센 연속 — 끊긴 날을 세지 않는다 */
  streak: number | undefined;
}) {
  const now = today();
  const month = monthGrid(monthOf(now));
  const { data, isPending } = useCalendar(familyId, profileId, { from: month.from, to: month.to });
  const days = (data?.days ?? []).filter((d) => monthOf(d.date) === monthOf(now));
  const active = days.filter((d) => d.minutes > 0);
  const minutes = active.reduce((sum, d) => sum + d.minutes, 0);
  const stickers = days.reduce((sum, d) => sum + d.stickers.length, 0);

  return (
    <section aria-label="이번 달" className="grid grid-cols-2 gap-2">
      <Stat label="이번 달 운동한 날" value={active.length} unit="일" loading={isPending} />
      <Stat label="이번 달 움직인 시간" value={minutes} unit="분" loading={isPending} />
      <Stat label="이어서" value={streak ?? 0} unit="일째" loading={streak == null} />
      <Stat label="이번 달 받은 칭찬" value={stickers} unit="장" loading={isPending} />
    </section>
  );
}

function Stat({
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
    <div className="card px-4 py-3.5">
      <p className="metric-label">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="metric-value text-metric mt-1">
          {value}
          <span className="metric-unit">{unit}</span>
        </p>
      )}
    </div>
  );
}

/** 최근 기록 — 움직인 날만 새것부터 일곱. 한 줄이 한 날, 누르면 그날 하루 기록 */
export function RecentDays({
  familyId,
  profileId,
}: {
  familyId: string | undefined;
  profileId: string;
}) {
  const now = today();
  const { data, isPending } = useCalendar(familyId, profileId, { from: daysBefore(20), to: now });
  const days = (data?.days ?? [])
    .filter((d) => d.minutes > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  return (
    <Card>
      <CardHead title="최근 기록" href="/calendar" />
      {isPending ? (
        <Skeleton className="mt-2 h-60 w-full rounded-2xl" />
      ) : days.length === 0 ? (
        <p className="text-ink-soft mt-1 text-sm">아직 없어요</p>
      ) : (
        <ul className="divide-rows mt-1">
          {days.map((d) => {
            const s = daySummary(d);
            const [, m, day] = d.date.split("-").map(Number);
            return (
              <li key={d.date}>
                <NavLink
                  href={`/calendar/${d.date}`}
                  className="press flex items-center gap-3 py-2.5"
                  aria-label={`${m}월 ${day}일 · ${d.minutes}분`}
                >
                  <span className="w-9 shrink-0 text-center leading-tight">
                    <span className="block text-base font-extrabold tabular-nums">{day}</span>
                    <span className="text-micro text-ink-soft block font-bold">
                      {d.date === now ? "오늘" : weekdayOf(d.date)}
                    </span>
                  </span>
                  <DayRings log={d} size={40} stroke={4.5} gap={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {d.entries.map((e) => e.title).join(" · ")}
                    </span>
                    <span className="text-caption text-ink-soft block whitespace-nowrap tabular-nums">
                      {s.total > 0 ? `${s.done} / ${s.total}개` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-base font-extrabold tabular-nums">
                    {d.minutes}
                    <span className="text-ink-soft text-caption ml-0.5 font-bold">분</span>
                  </span>
                  {d.stickers[0] && (
                    <StickerArt id={d.stickers[0].stickerId} className="size-8 shrink-0" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
