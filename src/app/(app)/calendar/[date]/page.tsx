"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { ChildSwitch } from "@/components/domain/child-switch";
import { DayRings } from "@/components/domain/day-rings";
import { StickerArt } from "@/components/domain/sticker-art";
import type { DayLog, Mission, ProfileWithSex } from "@/lib/api/types";
import { useCalendar, useFamilyProfiles, useFitnessMap, useMissions } from "@/lib/api/queries";
import { daySummary, didSomething, isRealDate, plannedDay, plannedOn } from "@/lib/day";
import { callName } from "@/lib/family";
import { VERIFIED_COPY } from "@/lib/mission";
import { PHASE_LABEL, sessionsOf, stepMinutes, totalMinutes } from "@/lib/session-plan";
import { useSession } from "@/lib/session";
import { stickerOf } from "@/lib/stickers";
import { daysBefore, longDate, monthOf, today, weekOf, weekdayOf } from "@/lib/today";
import { cn } from "@/lib/utils";
import { useIsKidView } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";

/**
 * 하루 기록 — 삼성헬스 「일일 활동」 처럼. 캘린더에서 날을 누르면 온다.
 *
 * 맨 위 날짜를 하루씩 넘기고, 그 아래 요일 줄의 작은 링으로 이번 주가 한눈에 보인다.
 * 가운데 큰 링 둘(움직인 시간 · 끝낸 운동)과 가운데 받은 스티커, 그 아래 칸과 점선 요약 줄.
 * 한 운동은 영상 그림과 함께, 받은 스티커는 크게. 부모 · 아이가 같은 화면을 본다.
 *
 * 어느 아이의 날인지는 `?profileId=` 가 먼저다 — 아이가 둘이면 스티커를 붙인 아이의 날로 와야 한다.
 * 아이 화면에서는 자기 것만 본다.
 */
export default function DayPage() {
  return (
    <Suspense fallback={<DaySkeleton back="/" />}>
      <Day />
    </Suspense>
  );
}

function Day() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const search = useSearchParams();
  const now = today();
  // 주소창 값은 믿지 않는다 — 달력에 없는 날(2026-13-01 · 2026-02-30)이면 오늘로
  const date = isRealDate(params.date) ? params.date : now;

  const kidView = useIsKidView();
  const { familyId, isPending, error: sessionError, refetch: refetchMe } = useSession();
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const { data: map, isLoading: mapLoading, error: mapError, refetch } = useFitnessMap(familyId);
  const { data: family } = useFamilyProfiles(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);
  const kids = (map?.members ?? []).filter((m) => m.role === "CHILD");
  const asked = kidView ? null : search.get("profileId");
  const who =
    kids.find((k) => k.profileId === asked) ??
    kids.find((k) => k.profileId === childProfileId) ??
    (kidView ? undefined : kids[0]);

  const week = weekOf(date);
  const {
    data: calendar,
    isPending: calendarPending,
    error: calendarError,
    refetch: refetchCalendar,
    isRefetching,
  } = useCalendar(familyId, who?.profileId ?? undefined, { from: week.from, to: week.to });
  // 한 번만 받는다 — 앞으로 할 것도 이 목록에서 날짜로 고른다(전에는 ACTIVE 와 ALL 을 둘 다 받았다)
  const { data: all } = useMissions(familyId, { scope: "ALL" });

  const back = kidView ? "/kid" : "/parent";
  const failure = sessionError ?? (map ? null : mapError);
  if (failure) {
    return (
      <>
        <AppBar backHref={back} title="하루 기록" />
        <Stage wide>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
          />
        </Stage>
      </>
    );
  }
  if (isPending || mapLoading) return <DaySkeleton back={back} />;
  // 볼 아이가 없다 — 아이가 아직 누구인지 안 골랐거나, 가족에 아이가 없다. 빈 칸을 기다리게 두지 않는다
  if (!who) {
    return (
      <>
        <AppBar backHref={back} title="하루 기록" />
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

  const logs = new Map((calendar?.days ?? []).map((d) => [d.date, d]));
  const log = logs.get(date);
  const summary = daySummary(log);
  // 한 칸이라도 한 것만 「한 운동」. 아직 시작 안 한 오늘 운동은 「할 운동」 이다
  const doneEntries = (log?.entries ?? []).filter(didSomething);
  // 쉬기로 한 날에는 할 운동을 늘어놓지 않는다 — 쉬는 날에 운동을 권하지 않는다(규칙 15).
  // 그날 기록이 오기 전에도 — 이미 한 운동 · 쉬기로 한 날인지 모르는 채 「할 운동」 이 먼저 번쩍였다
  const planned =
    !calendar || log?.rest
      ? []
      : plannedOn(all?.missions ?? [], who.profileId ?? undefined, date, now).filter(
          (m) => !doneEntries.some((e) => e.missionId === m.missionId),
        );
  const plannedDays = new Set(
    (all?.missions ?? [])
      .filter((m) => m.participants?.some((p) => p.profileId === who.profileId))
      .map((m) => plannedDay(m, now))
      .filter((d): d is string => Boolean(d)),
  );
  // 갈 수 있는 날 — 오늘까지는 전부, 앞날은 운동을 잡아 둔 날만
  const open = (d: string) => d <= now || plannedDays.has(d);
  // 앞날에서 뒤로 갈 때는 그 앞의 잡아 둔 날, 없으면 오늘 — 하루씩 세며 돌지 않는다
  const prev =
    date > now
      ? ([...plannedDays]
          .filter((p) => p > now && p < date)
          .sort()
          .at(-1) ?? now)
      : daysBefore(1, date);
  const next = (() => {
    const d = daysBefore(-1, date);
    if (d <= now) return d;
    return [...plannedDays].filter((p) => p > date).sort()[0] ?? null;
  })();
  const nameOf = (profileId: string, fallback: string) =>
    callName(
      family?.profiles?.find((p) => p.profileId === profileId) as ProfileWithSex | undefined,
      fallback,
      kidView,
    );
  const suffix = asked && asked === who.profileId ? `?profileId=${encodeURIComponent(asked)}` : "";
  const go = (d: string) => router.replace(`/calendar/${d}${suffix}`, { scroll: false });
  const sticker = log?.stickers[0];

  return (
    <>
      <AppBar
        backHref={back}
        title={kidView ? "하루 기록" : `${who.name ?? "아이"}의 하루`}
        right={
          <NavLink
            href={`/calendar?month=${monthOf(date)}${suffix ? `&${suffix.slice(1)}` : ""}`}
            aria-label="달력"
            className="press text-ink-soft grid size-10 place-items-center rounded-full"
          >
            <CalendarDays aria-hidden className="size-5" />
          </NavLink>
        }
      />
      <Stage wide className="space-y-3">
        {!kidView && kids.length > 1 && (
          <ChildSwitch
            kids={kids}
            selectedId={who.profileId}
            onSelect={(id) => {
              setChild(id);
              router.replace(`/calendar/${date}?profileId=${encodeURIComponent(id)}`, {
                scroll: false,
              });
            }}
          />
        )}

        {/* 날짜 — 하루씩 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(prev)}
            aria-label="전날"
            className="press text-ink-soft grid size-11 place-items-center rounded-full"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <p className="min-w-44 py-2.5 text-center text-base font-extrabold">
            {date === now ? "오늘" : longDate(date)}
          </p>
          <button
            type="button"
            onClick={() => next && go(next)}
            disabled={!next}
            aria-label="다음 날"
            className="press text-ink-soft grid size-11 place-items-center rounded-full disabled:opacity-30"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        {/* 요일 줄 — 그날마다 작은 링 */}
        <ol className="grid grid-cols-7">
          {week.days.map((d) => {
            const day = logs.get(d);
            const got = day?.stickers[0] ? stickerOf(day.stickers[0].stickerId) : undefined;
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => go(d)}
                  disabled={!open(d)}
                  aria-current={d === date ? "date" : undefined}
                  aria-label={`${longDate(d)}${day && day.minutes > 0 ? ` · ${day.minutes}분` : ""}${got ? ` · ${got.label} 스티커` : ""}`}
                  className="press flex w-full flex-col items-center gap-1 disabled:opacity-40"
                >
                  <span
                    className={cn(
                      "text-caption font-bold",
                      d === now ? "text-signal-deep" : "text-ink-soft",
                    )}
                  >
                    {weekdayOf(d)}
                  </span>
                  <span
                    className={cn(
                      "grid size-11 place-items-center rounded-full",
                      d === date && "bg-signal-soft",
                    )}
                  >
                    <DayRings log={day} size={34} stroke={4.5} gap={2} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {calendarError ? (
          <section className="card">
            <ErrorState
              error={calendarError}
              onRetry={() => void refetchCalendar()}
              retrying={isRefetching}
            />
          </section>
        ) : calendarPending ? (
          <Skeleton className="h-[26rem] w-full rounded-3xl" />
        ) : (
          <section className="card-hero">
            {/* 쉬는 날 카드를 쓴 날 — 빈 날이 아니라 쉬기로 한 날이다. 그날 움직였으면 한 것이 먼저다(달력 칸과 같게) */}
            {log?.rest && summary.moved === 0 && (
              <p className="text-caption text-ink-soft mb-2 text-center font-extrabold">
                쉬기로 한 날
              </p>
            )}
            <div className="grid place-items-center pt-2">
              <DayRings
                log={log}
                size={196}
                stroke={22}
                gap={5}
                center={sticker ? <StickerArt id={sticker.stickerId} className="size-20" /> : null}
              />
            </div>

            {/* 칭찬은 받은 날에만 칸으로 — 0장을 적어 두면 못 받은 날이 된다(규칙 12).
                둥근 회색 면 없이 선으로 나눈다 */}
            <div className="divide-line mt-5 grid auto-cols-fr grid-flow-col divide-x">
              <Tile
                dot="bg-signal"
                label="움직인 시간"
                value={summary.moved}
                unit="분"
                goal={summary.planned ? `/ ${summary.planned}분` : null}
              />
              <Tile
                dot="bg-mark"
                label="끝낸 운동"
                value={summary.done}
                unit="개"
                goal={summary.total ? `/ ${summary.total}개` : null}
              />
              {summary.stickers > 0 && <Tile label="칭찬" value={summary.stickers} unit="장" />}
            </div>

            {(summary.done > 0 || summary.verified.length > 0) && (
              <dl className="mt-5 space-y-2.5">
                {(["WARMUP", "MAIN", "COOLDOWN"] as const)
                  .filter((phase) => summary.phases[phase] > 0)
                  .map((phase) => (
                    <Leader
                      key={phase}
                      label={PHASE_LABEL[phase]}
                      value={`${summary.phases[phase]}분`}
                    />
                  ))}
                {summary.verified.map((v) => (
                  <Leader key={v} label="확인" value={VERIFIED_COPY[v]} />
                ))}
              </dl>
            )}
          </section>
        )}

        {doneEntries.length > 0 && (
          <Card>
            <CardHead title="한 운동" />
            <ul className="mt-2 space-y-3">
              {doneEntries.map((entry) => (
                <EntryRows
                  key={entry.missionId}
                  entry={entry}
                  mission={all?.missions?.find((m) => m.missionId === entry.missionId)}
                />
              ))}
            </ul>
          </Card>
        )}

        {planned.length > 0 && (
          <Card>
            <CardHead title="할 운동" />
            <ul className="mt-2 space-y-3">
              {planned.map((m) => (
                <PlannedRows key={m.missionId} mission={m} nameOf={nameOf} />
              ))}
            </ul>
          </Card>
        )}

        {log && log.stickers.length > 0 && (
          <Card>
            <CardHead title="받은 칭찬" />
            <ul className="divide-rows mt-1">
              {log.stickers.map((st) => (
                <li key={st.cheerId} className="flex items-center gap-4 py-3">
                  <StickerArt id={st.stickerId} className="size-20 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lead font-extrabold">
                      {stickerOf(st.stickerId)?.label ?? "칭찬"}
                    </p>
                    <p className="text-caption text-ink-soft mt-0.5 font-bold">
                      {nameOf(st.fromProfileId, st.fromName)}
                    </p>
                    {/* 스티커 이름을 그대로 적어 보낸 말은 한 번만 — 같은 말이 두 줄이면 틀린 화면처럼 보인다 */}
                    {st.message && st.message.trim() !== stickerOf(st.stickerId)?.label && (
                      <p className="text-body mt-1.5 leading-snug font-semibold">{st.message}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!kidView && date === now && summary.moved > 0 && summary.stickers === 0 && (
          <NavLink
            href={`/parent/sticker/${who.profileId}`}
            className="press bg-signal-strong flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
          >
            칭찬 스티커 붙이기
          </NavLink>
        )}
      </Stage>
    </>
  );
}

/** 링 아래 칸 하나 — 이름 · 큰 숫자 · 목표. 점은 링 색이다 — 링이 아닌 칭찬 칸에는 없다 */
function Tile({
  dot,
  label,
  value,
  unit,
  goal,
}: {
  dot?: string;
  label: string;
  value: number;
  unit: string;
  goal?: string | null;
}) {
  return (
    <div className="px-2 text-center">
      <p className="text-micro text-ink-soft flex items-center justify-center gap-1 font-bold">
        {dot && <span aria-hidden className={cn("size-2 rounded-full", dot)} />}
        {label}
      </p>
      <p className="metric-value mt-1.5 text-2xl">
        {value}
        <span className="metric-unit">{unit}</span>
      </p>
      <p className="text-micro text-faint mt-0.5 h-4 font-semibold tabular-nums">{goal ?? ""}</p>
    </div>
  );
}

/** 점선으로 잇는 요약 한 줄 */
function Leader({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <dt className="text-ink-soft shrink-0 font-semibold">{label}</dt>
      <span aria-hidden className="border-line mb-1 min-w-4 flex-1 border-b-2 border-dotted" />
      <dd className="shrink-0 font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * 칸 하나의 그림 — 영상이 있으면 썸네일. 없으면 두지 않는다 — 회색 칸에 「준비 · 본 · 정리」 를 적으면
 * 둥근 바탕 안의 글자가 되고(9/25), 바로 아래 줄(「준비운동 · 1분」)과 같은 말을 한 번 더 한다.
 * 한 운동의 칸은 모두 영상이 있거나 모두 없어서 줄이 어긋나지 않는다.
 */
function Thumb({ videoId }: { videoId?: string | null }) {
  if (!videoId) return null;
  return <VideoThumb videoId={videoId} className="aspect-video w-20 shrink-0 rounded-xl" />;
}

/** 그날 한 운동 한 개 — 칸마다 한 줄. 칸 없이 직접 적은 것(걷기 등)은 무엇으로 확인했는지만 */
function EntryRows({ entry, mission }: { entry: DayLog["entries"][number]; mission?: Mission }) {
  // 칸 이름과 영상만 쓴다 — 끝냈는지는 그날 기록(`entry.sessions`)이 말한다
  const clips = sessionsOf(mission, null);
  if (!entry.sessions || entry.sessions.length === 0) {
    return (
      <li className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{entry.title}</span>
          <span className="text-caption text-ink-soft block">
            {[
              entry.minutes > 0 && `${entry.minutes}분`,
              entry.verifiedBy && VERIFIED_COPY[entry.verifiedBy],
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        {entry.completed && <Done />}
      </li>
    );
  }
  return (
    <li>
      <p className="text-sm font-extrabold">{entry.title}</p>
      <ul className="mt-2 space-y-2">
        {entry.sessions.map((s, i) => {
          const clip = clips.find((c) => c.title === s.title)?.clip ?? clips[i]?.clip;
          return (
            <li key={`${s.title}-${i}`} className="flex items-center gap-3">
              <Thumb videoId={mission ? clip?.videoId : null} />
              <span className={cn("min-w-0 flex-1", !s.done && "opacity-50")}>
                <span className="block truncate text-sm font-bold">{s.title}</span>
                <span className="text-caption text-ink-soft block">
                  {PHASE_LABEL[s.phase]} · {stepMinutes(s)}분
                </span>
              </span>
              {s.done && <Done />}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** 했다는 표시 — 초록 체크 하나. 둥근 면에 넣지 않는다. 초록은 해낸 자리에만 */
function Done() {
  return (
    <Check role="img" aria-label="했어요" className="text-done size-5 shrink-0" strokeWidth={3} />
  );
}

/** 앞으로 할 운동 한 개 */
function PlannedRows({
  mission,
  nameOf,
}: {
  mission: Mission;
  nameOf: (profileId: string, fallback: string) => string;
}) {
  // 앞으로 할 운동이라 끝낸 칸이 없다 — 칸 이름 · 시간 · 영상만 쓴다
  const sessions = sessionsOf(mission, null);
  const together = (mission.participants?.length ?? 0) > 1;
  return (
    <li>
      <p className="text-sm font-extrabold">
        {mission.title}
        {totalMinutes(sessions) > 0 && (
          <span className="text-ink-soft ml-1.5 font-bold">{totalMinutes(sessions)}분</span>
        )}
      </p>
      {together && (
        <p className="text-caption text-ink-soft mt-0.5 font-semibold">
          {(mission.participants ?? [])
            .map((p) => nameOf(p.profileId ?? "", p.name ?? ""))
            .join(" · ")}
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {sessions.map((s) => (
          <li key={s.position} className="flex items-center gap-3">
            <Thumb videoId={s.clip?.videoId} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{s.title}</span>
              <span className="text-caption text-ink-soft block">
                {PHASE_LABEL[s.phase]} · {stepMinutes(s)}분
              </span>
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function DaySkeleton({ back }: { back: string }) {
  return (
    <>
      <AppBar backHref={back} title="하루 기록" />
      <Stage wide className="space-y-3">
        <Skeleton className="mx-auto h-11 w-52 rounded-full" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-[26rem] w-full rounded-3xl" />
      </Stage>
    </>
  );
}
