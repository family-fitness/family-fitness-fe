"use client";

import { Plus } from "lucide-react";

import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { StreakChip } from "@/components/domain/streak-chip";
import { WeekDots } from "@/components/domain/week-dots";
import type { DayLog, FitnessMapMember, Mission } from "@/lib/api/types";
import { useFamilyCalendars, useProgress, useRestDays } from "@/lib/api/queries";
import { dayWork, todayLine } from "@/lib/day";
import { monthOf, today, weekOf } from "@/lib/today";
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
  missionsFailed,
  onInvite,
}: {
  kids: FitnessMapMember[];
  selectedId: string | undefined;
  onSelect: (profileId: string) => void;
  familyId: string | undefined;
  /** 아직 못 받았으면 undefined — 오늘 한마디를 말하지 않는다 */
  missions: Mission[] | undefined;
  missionsFailed: boolean;
  onInvite: () => void;
}) {
  const week = weekOf();
  const ids = kids.map((k) => k.profileId ?? "").filter(Boolean);
  // 부모 홈 「이번 주」 와 같은 범위 · 같은 키 — 고른 아이 것은 캐시를 나눠 쓴다
  const calendars = useFamilyCalendars(familyId, ids, { from: week.from, to: week.to });
  // 받는 중이면 undefined · 못 받았으면 null — 빈 한 주로 그리지 않는다
  const logsOf = (profileId: string | undefined) => {
    const q = profileId ? calendars[ids.indexOf(profileId)] : undefined;
    return q?.data?.days ?? (q?.error ? null : undefined);
  };
  // 쉬는 날 카드는 가족 단위 — 달력 기록을 못 받아도 오늘이 쉬는 날인지 안다(규칙 15)
  const { data: restDays } = useRestDays(familyId, monthOf(today()));
  const restToday = Boolean(restDays?.days.includes(today()));

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
            rest={restToday}
            missions={missions}
            missionsFailed={missionsFailed}
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
  rest,
  missions,
  missionsFailed,
  days,
}: {
  kid: FitnessMapMember;
  selected: boolean;
  onSelect: () => void;
  /** 이번 주 기록. 받는 중이면 undefined · 못 받았으면 null */
  logs: DayLog[] | null | undefined;
  /** 오늘이 쉬는 날인가(가족 단위) */
  rest: boolean;
  missions: Mission[] | undefined;
  missionsFailed: boolean;
  /** 이번 주 월~일 */
  days: string[];
}) {
  const { data: progress } = useProgress(kid.profileId);
  const now = today();
  // 운동 목록을 못 받았으면 오늘을 말하지 않는다 — 「오늘 운동 없어요」 로 그리면 부모가 같은 운동을 또 받는다
  const status = missions ? todayLine(dayWork(missions, kid.profileId, now), rest) : null;
  const score = kid.latest?.overallPercentile ?? null;
  // 잰 적은 있는데 점수가 없는 아이 — 만 7~10세는 규준이 비어 있다(규칙 8). 「아직 재지 않았어요」 가 아니다
  const measured = Boolean(kid.latest?.testedOn);

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
            {status ??
              (missionsFailed ? (
                "—"
              ) : (
                <span className="skeleton inline-block h-3 w-16 rounded align-middle" />
              ))}
            {progress && progress.streakDays > 1 && (
              <>
                {" · "}
                <StreakChip days={progress.streakDays} />
              </>
            )}
          </span>
          <WeekDots days={days} logs={logs} />
        </span>
        {/* 신체 점수 — 또래 평균 50 눈금과 늘 같이(규칙 10). 안 쟀으면 0 으로 그리지 않는다.
            쟀는데 비교 기준이 없는 나이면 빈 막대 — 0 이 아니라 비어 있음이다 */}
        <span className="flex w-24 shrink-0 flex-col items-end">
          {measured ? (
            <>
              <span
                className={cn("metric-value text-2xl leading-none", score == null && "text-faint")}
              >
                {score ?? "—"}
                {score != null && <span className="metric-unit">점</span>}
              </span>
              <span
                className="record-rail mt-1.5 w-16"
                role="img"
                aria-label={
                  score != null
                    ? `신체 점수 ${score}, 또래 평균 50`
                    : "신체 점수 없음, 또래 평균 50"
                }
              >
                {score != null ? (
                  <>
                    <span className="record-fill" style={{ width: `${score}%` }} />
                    <span className="record-avg" />
                  </>
                ) : (
                  <span className="record-dash" />
                )}
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
