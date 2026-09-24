"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { ChildSwitch } from "@/components/domain/child-switch";
import { DayRings } from "@/components/domain/day-rings";
import { StickerArt } from "@/components/domain/sticker-art";
import type { DayLog, Mission, MissionSession, ProfileWithSex } from "@/lib/api/types";
import { useCalendar, useFamilyProfiles, useFitnessMap, useMissions } from "@/lib/api/queries";
import { daySummary, plannedDay, plannedOn } from "@/lib/day";
import { callName } from "@/lib/family";
import { VERIFIED_COPY } from "@/lib/mission";
import { PHASE_LABEL, sessionsOf, totalMinutes } from "@/lib/session-plan";
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
 * 가운데 큰 링 셋(움직인 시간 · 끝낸 운동 · 칭찬), 그 아래 칸 셋과 점선 요약 줄.
 * 한 운동은 영상 그림과 함께, 받은 스티커는 크게. 부모 · 아이가 같은 화면을 본다.
 */
export default function DayPage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const now = today();
  // 주소창 값은 믿지 않는다 — 모양이 틀리면 오늘로
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date : now;

  const kidView = useIsKidView();
  const { familyId, isPending, error: sessionError } = useSession();
  const { data: map, isPending: mapPending, error: mapError, refetch } = useFitnessMap(familyId);
  const { data: family } = useFamilyProfiles(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);
  const kids = (map?.members ?? []).filter((m) => m.role === "CHILD");
  const who = kids.find((k) => k.profileId === childProfileId) ?? (kidView ? undefined : kids[0]);

  const week = weekOf(date);
  const { data: calendar, isPending: calendarPending } = useCalendar(
    familyId,
    who?.profileId ?? undefined,
    { from: week.from, to: week.to },
  );
  const { data: active } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });
  const { data: all } = useMissions(familyId, { scope: "ALL" });

  const back = kidView ? "/kid" : "/parent";
  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar backHref={back} title="하루 기록" />
        <Stage wide>
          <ErrorState error={failure} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }
  if (isPending || mapPending || !who) return <DaySkeleton back={back} />;

  const logs = new Map((calendar?.days ?? []).map((d) => [d.date, d]));
  const log = logs.get(date);
  const summary = daySummary(log);
  const planned = plannedOn(active?.missions ?? [], who.profileId ?? undefined, date, now).filter(
    (m) => !log?.entries.some((e) => e.missionId === m.missionId),
  );
  const plannedDays = new Set(
    (active?.missions ?? [])
      .filter((m) => m.participants?.some((p) => p.profileId === who.profileId))
      .map((m) => plannedDay(m, now))
      .filter(Boolean),
  );
  const nameOf = (profileId: string, fallback: string) =>
    callName(
      family?.profiles?.find((p) => p.profileId === profileId) as ProfileWithSex | undefined,
      fallback,
      kidView,
    );
  const go = (d: string) => router.replace(`/calendar/${d}`, { scroll: false });
  const sticker = log?.stickers[0];

  return (
    <>
      <AppBar
        backHref={back}
        title="하루 기록"
        right={
          <NavLink
            href={`/calendar?month=${monthOf(date)}`}
            aria-label="달력"
            className="press text-ink-soft grid size-10 place-items-center rounded-full"
          >
            <CalendarDays aria-hidden className="size-5" />
          </NavLink>
        }
      />
      <Stage wide className="space-y-3">
        {!kidView && kids.length > 1 && (
          <ChildSwitch kids={kids} selectedId={who.profileId} onSelect={(id) => setChild(id)} />
        )}

        {/* 날짜 — 하루씩 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(daysBefore(1, date))}
            aria-label="전날"
            className="press text-ink-soft grid size-11 place-items-center rounded-full"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <p className="bg-paper min-w-44 rounded-full px-6 py-2.5 text-center text-base font-extrabold shadow-sm">
            {date === now ? "오늘" : longDate(date)}
          </p>
          <button
            type="button"
            onClick={() => go(daysBefore(-1, date))}
            disabled={date >= now && !plannedDays.has(daysBefore(-1, date))}
            aria-label="다음 날"
            className="press text-ink-soft grid size-11 place-items-center rounded-full disabled:opacity-30"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
        </div>

        {/* 요일 줄 — 그날마다 작은 링 */}
        <ol className="grid grid-cols-7">
          {week.days.map((d) => {
            const future = d > now && !plannedDays.has(d);
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => go(d)}
                  disabled={future}
                  aria-pressed={d === date}
                  aria-label={longDate(d)}
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
                    <DayRings log={logs.get(d)} size={34} stroke={4} gap={1.5} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {calendarPending ? (
          <Skeleton className="h-[26rem] w-full rounded-3xl" />
        ) : (
          <section className="card-hero">
            <div className="grid place-items-center pt-2">
              <DayRings
                log={log}
                size={196}
                stroke={18}
                gap={4}
                center={sticker ? <StickerArt id={sticker.stickerId} className="size-16" /> : null}
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
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
              <Tile dot="bg-signal-deep" label="칭찬" value={summary.stickers} unit="장" />
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

        {log && log.entries.length > 0 && (
          <Card>
            <CardHead title="한 운동" />
            <ul className="mt-2 space-y-3">
              {log.entries.map((entry) => (
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
            <ul className="mt-2 space-y-2">
              {log.stickers.map((st) => (
                <li key={st.cheerId} className="bg-sub flex items-center gap-4 rounded-2xl p-3">
                  <StickerArt id={st.stickerId} className="size-20 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lead font-extrabold">
                      {stickerOf(st.stickerId)?.label ?? "칭찬"}
                    </p>
                    <p className="text-caption text-ink-soft mt-0.5 font-bold">
                      {nameOf(st.fromProfileId, st.fromName)}
                    </p>
                    {st.message && (
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

/** 링 아래 칸 하나 — 이름 · 큰 숫자 · 목표 */
function Tile({
  dot,
  label,
  value,
  unit,
  goal,
}: {
  dot: string;
  label: string;
  value: number;
  unit: string;
  goal?: string | null;
}) {
  return (
    <div className="bg-sub rounded-2xl px-2 py-3 text-center">
      <p className="text-micro text-ink-soft flex items-center justify-center gap-1 font-bold">
        <span aria-hidden className={cn("size-2 rounded-full", dot)} />
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

/** 칸 하나의 그림 — 영상이 있으면 썸네일, 없으면 준비 · 본 · 정리 조각 */
function Thumb({ videoId, phase }: { videoId?: string | null; phase: MissionSession["phase"] }) {
  if (videoId)
    return <VideoThumb videoId={videoId} className="aspect-video w-20 shrink-0 rounded-xl" />;
  return (
    <span
      aria-hidden
      className={cn(
        "text-caption grid aspect-video w-20 shrink-0 place-items-center rounded-xl font-extrabold",
        phase === "MAIN" ? "bg-signal-strong text-white" : "bg-signal-soft text-signal-deep",
      )}
    >
      {PHASE_LABEL[phase].replace("운동", "")}
    </span>
  );
}

/** 그날 한 운동 한 개 — 칸마다 한 줄. 칸 없이 직접 적은 것(걷기 등)은 무엇으로 확인했는지만 */
function EntryRows({ entry, mission }: { entry: DayLog["entries"][number]; mission?: Mission }) {
  const clips = sessionsOf(mission);
  if (!entry.sessions || entry.sessions.length === 0) {
    return (
      <li className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{entry.title}</span>
          <span className="text-caption text-ink-soft block">
            {entry.minutes > 0 && `${entry.minutes}분 · `}
            {entry.verifiedBy ? VERIFIED_COPY[entry.verifiedBy] : ""}
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
              <Thumb videoId={mission ? clip?.videoId : null} phase={s.phase} />
              <span className={cn("min-w-0 flex-1", !s.done && "opacity-50")}>
                <span className="block truncate text-sm font-bold">{s.title}</span>
                <span className="text-caption text-ink-soft block">
                  {PHASE_LABEL[s.phase]}
                  {s.minutes != null && ` · ${s.minutes}분`}
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

/** 했다는 표시 — 초록은 해낸 자리에만 */
function Done() {
  return (
    <span className="bg-done-soft text-done grid size-7 shrink-0 place-items-center rounded-full">
      <Check aria-label="했어요" className="size-4" strokeWidth={3} />
    </span>
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
  const sessions = sessionsOf(mission);
  const together = (mission.participants?.length ?? 0) > 1;
  return (
    <li>
      <p className="text-sm font-extrabold">
        {mission.title}
        <span className="text-ink-soft ml-1.5 font-bold">{totalMinutes(sessions)}분</span>
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
            <Thumb videoId={s.clip?.videoId} phase={s.phase} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{s.title}</span>
              <span className="text-caption text-ink-soft block">
                {PHASE_LABEL[s.phase]}
                {s.minutes != null && ` · ${s.minutes}분`}
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
