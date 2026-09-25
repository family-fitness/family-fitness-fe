"use client";

import { Plus } from "lucide-react";

import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { StreakChip } from "@/components/domain/streak-chip";
import type { DayLog, FitnessMapMember, Mission } from "@/lib/api/types";
import { useFamilyCalendars, useProgress } from "@/lib/api/queries";
import { sessionsOf } from "@/lib/session-plan";
import { today, weekOf } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 부모 홈 맨 위 — 우리 아이 모두를 한 번에(9/25 「부모 입장에선 우리 아이 모두 통계를 한 번에 보여 주고
 * 그 아래 따로 선택한 아이 정보만 상세히」).
 *
 * 아이마다 한 줄 — 사진 · 이름 · 오늘 · 며칠 이어서 · 이번 주 점 일곱 · 신체 점수(또래 평균 50 눈금과 함께).
 * 누르면 그 아이를 고른다 — 아래 묶음(육각형 · 오늘 운동 · 이번 주)이 그 아이로 바뀐다.
 * 줄은 등록한 차례로 둔다. 점수로 줄 세우면 형제 비교가 된다(규칙 10).
 */
export function KidsOverview({
  kids,
  selectedId,
  onSelect,
  familyId,
  missions,
  onInvite,
}: {
  kids: FitnessMapMember[];
  selectedId: string | undefined;
  onSelect: (profileId: string) => void;
  familyId: string | undefined;
  missions: Mission[] | undefined;
  onInvite: () => void;
}) {
  const week = weekOf();
  const ids = kids.map((k) => k.profileId ?? "").filter(Boolean);
  // 부모 홈 「이번 주」 와 같은 범위 · 같은 키 — 고른 아이 것은 캐시를 나눠 쓴다
  const calendars = useFamilyCalendars(familyId, ids, { from: week.from, to: week.to });
  const logsOf = (profileId: string | undefined) =>
    (profileId ? calendars[ids.indexOf(profileId)]?.data?.days : undefined) ?? [];

  return (
    <section className="card" aria-label="우리 아이">
      <CardHead title="우리 아이" meta={`${kids.length}명`} />
      <ul className="divide-rows">
        {kids.map((kid) => (
          <KidLine
            key={kid.profileId}
            kid={kid}
            selected={kid.profileId === selectedId}
            onSelect={() => kid.profileId && onSelect(kid.profileId)}
            logs={logsOf(kid.profileId)}
            missions={missions}
            days={week.days}
          />
        ))}
      </ul>
      <div className="border-line mt-1 grid grid-cols-2 gap-2 border-t pt-3">
        <NavLink
          href="/start/child"
          className="press bg-sub flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
        >
          <Plus aria-hidden className="text-signal-strong size-4" />
          아이 등록하기
        </NavLink>
        <button
          type="button"
          onClick={onInvite}
          className="press bg-sub flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
        >
          <ArtIcon name="icon/menu-invite" className="size-5" />
          초대하기
        </button>
      </div>
    </section>
  );
}

/** 아이 한 줄. 누르면 이 아이를 고른다 — 고른 아이는 사진에 파랑 테 */
function KidLine({
  kid,
  selected,
  onSelect,
  logs,
  missions,
  days,
}: {
  kid: FitnessMapMember;
  selected: boolean;
  onSelect: () => void;
  logs: DayLog[];
  missions: Mission[] | undefined;
  /** 이번 주 월~일 */
  days: string[];
}) {
  const { data: progress } = useProgress(kid.profileId);
  const now = today();
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const todayLog = byDate.get(now);

  // 오늘 이 아이가 하는 운동 — 걸음수(자기 신고)는 세지 않는다(규칙 2)
  const mine = (missions ?? []).filter(
    (m) =>
      m.targetMetric !== "STEPS" &&
      (m.startDate ?? "") <= now &&
      now <= (m.endDate ?? "") &&
      m.participants?.some((p) => p.profileId === kid.profileId),
  );
  const sessions = mine.flatMap((m) => sessionsOf(m, kid.profileId));
  const doneCount = sessions.filter((s) => s.completed).length;
  const status =
    sessions.length > 0 && doneCount === sessions.length
      ? "오늘 다 했어요"
      : doneCount > 0
        ? `오늘 ${doneCount} / ${sessions.length}개`
        : todayLog?.rest
          ? "오늘 쉬는 날"
          : mine.length > 0
            ? "오늘 운동 있어요"
            : "오늘 운동 없어요";
  const score = kid.latest?.overallPercentile ?? null;
  const moved = days.filter((d) => (byDate.get(d)?.minutes ?? 0) > 0).length;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="press flex min-h-16 w-full items-center gap-3 py-3 text-left"
      >
        <span
          className={cn(
            "shrink-0 rounded-full",
            selected && "ring-signal ring-offset-paper ring-2 ring-offset-2",
          )}
        >
          <ProfileAvatar profileId={kid.profileId} name={kid.name} tone="signal" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-extrabold", selected && "text-signal-deep")}>
            {kid.name}
          </span>
          <span className="text-caption text-ink-soft block truncate">
            {status}
            {progress && progress.streakDays > 1 && (
              <>
                {" · "}
                <StreakChip days={progress.streakDays} />
              </>
            )}
          </span>
          {/* 이번 주 월~일 — 움직인 날만 채운다. 쉰 날을 빠진 날처럼 칠하지 않는다 */}
          <span className="mt-1.5 flex gap-1" aria-label={`이번 주 ${moved}일 움직였어요`}>
            {days.map((d) => {
              const on = (byDate.get(d)?.minutes ?? 0) > 0;
              return (
                <span
                  key={d}
                  aria-hidden
                  className={cn(
                    "size-2.5 rounded-full",
                    on ? "bg-signal" : "bg-sub",
                    d === now && !on && "ring-signal ring-1",
                  )}
                />
              );
            })}
          </span>
        </span>
        {/* 신체 점수 — 또래 평균 50 눈금과 늘 같이(규칙 10). 안 쟀으면 0 으로 그리지 않는다 */}
        <span className="flex w-24 shrink-0 flex-col items-end">
          {score != null ? (
            <>
              <span className="metric-value text-2xl leading-none">
                {score}
                <span className="metric-unit">점</span>
              </span>
              <span
                className="record-rail mt-1.5 w-16"
                role="img"
                aria-label={`신체 점수 ${score}, 또래 평균 50`}
              >
                <span className="record-fill" style={{ width: `${score}%` }} />
                <span className="record-avg" />
              </span>
            </>
          ) : (
            <span className="text-caption text-ink-soft text-right">아직 재지 않았어요</span>
          )}
        </span>
      </button>
    </li>
  );
}
