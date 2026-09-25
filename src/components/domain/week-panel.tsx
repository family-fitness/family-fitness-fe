"use client";

import type { ReactNode } from "react";

import { CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { TodayRings } from "@/components/domain/today-rings";
import { WeekTower } from "@/components/scene/week-tower";
import type { DayLog, Mission } from "@/lib/api/types";
import { today } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 홈의 둘째 묶음 — 「이번 주」. 오늘 링 셋 · 요일 탑 · 그 아래 한 줄(바로가기 · 받은 것).
 *
 * 부모 홈과 아이 홈이 같은 틀을 쓴다. 링 · 탑은 같은 날을 같은 셈으로 그리고,
 * 아랫줄만 다르다 — 부모는 캘린더 · 가족 리그 · 우리 가족, 아이는 받은 스티커(받았을 때만) · 업적 · 신체 점수.
 * 카드 하나에 기능 하나씩 쌓던 것(이번 주 · 운동 찾기 · 가족)을 한 덩어리로 합쳤다(9/25).
 */
export function WeekPanel({
  profileId,
  missions,
  days,
  logs,
  loading,
  failed = false,
  onRetry,
  meta,
  href,
  children,
}: {
  profileId: string | undefined;
  missions: Mission[] | undefined;
  /** 이번 주 날짜 일곱 개(월~일) */
  days: string[];
  logs: DayLog[] | undefined;
  /** 기록을 받는 중 — 탑은 받은 뒤에 짓는다(0분으로 먼저 지었다 다시 짓지 않게) */
  loading: boolean;
  /** 기록을 못 받았다 — 빈 탑과 0분으로 그리면 한 주를 쉰 것처럼 보인다 */
  failed?: boolean;
  onRetry?: () => void;
  /** 머리 오른쪽 — 이번 주 합계나 이어서 한 날 */
  meta?: ReactNode;
  /** 머리를 누르면 갈 곳 — 아이 홈은 오늘 하루 기록 */
  href?: string;
  /** 맨 아랫줄 */
  children: ReactNode;
}) {
  return (
    <section className="card" aria-label="이번 주">
      <CardHead title="이번 주" meta={failed ? undefined : meta} href={href} />
      {failed ? (
        <p className="text-ink-soft mt-1 flex items-center justify-between gap-3 text-sm">
          이번 주 기록을 불러오지 못했어요
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="press text-signal-strong min-h-11 shrink-0 px-1 font-extrabold"
            >
              다시 불러오기
            </button>
          )}
        </p>
      ) : (
        <>
          <TodayRings
            profileId={profileId}
            missions={missions}
            weekLogs={logs}
            size={104}
            className="mt-2"
          />
          {loading ? (
            <Skeleton className="mt-3 aspect-[320/140] w-full rounded-2xl" />
          ) : (
            <WeekTower
              days={days}
              logs={logs}
              today={today()}
              height={140}
              className="-mx-1 mt-2"
            />
          )}
        </>
      )}
      <div className="border-line mt-3 border-t pt-3">{children}</div>
    </section>
  );
}

/** 이번 주 합계 — 머리 곁말. 쉰 날은 세지 않는다 */
export function weekTotals(days: string[], logs: DayLog[] | undefined) {
  const byDate = new Map((logs ?? []).map((l) => [l.date, l]));
  const values = days.map((d) => byDate.get(d)?.minutes ?? 0);
  return {
    minutes: values.reduce((a, b) => a + b, 0),
    active: values.filter((v) => v > 0).length,
  };
}

/**
 * 묶음 맨 아랫줄의 칸 하나 — 그림 · 이름 · 곁말. 칸 셋이 한 줄에 선다(카드가 아니라 칸).
 * `href` 가 없으면 누르지 않는 칸(신체 점수처럼 보기만 하는 것).
 */
export function PanelCell({
  href,
  label,
  note,
  art,
}: {
  href?: string;
  label: string;
  note?: ReactNode;
  /** 칸 위의 그림 — 그림 이름이나 직접 그린 것(점수 막대) */
  art: ReactNode;
}) {
  const body = (
    <>
      <span className="grid h-10 place-items-center">{art}</span>
      <span className="mt-1 block text-sm font-extrabold">{label}</span>
      {note && <span className="text-caption text-ink-soft block truncate">{note}</span>}
    </>
  );
  const shape = "flex min-h-24 flex-col items-center justify-start px-1 py-1 text-center";
  return href ? (
    <NavLink href={href} className={cn("press", shape)}>
      {body}
    </NavLink>
  ) : (
    <div className={shape}>{body}</div>
  );
}

/** 칸들을 한 줄로 — 사이는 선으로 나눈다. 칸 수만큼 고르게(받은 스티커처럼 있을 때만 서는 칸이 있다) */
export function PanelCells({ children }: { children: ReactNode }) {
  return <div className="divide-line grid auto-cols-fr grid-flow-col divide-x">{children}</div>;
}
