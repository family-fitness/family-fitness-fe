"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";

import { ArtIcon } from "@/components/ui/art-icon";
import { CardHead } from "@/components/ui/card";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { FactorView, FirstMeasure } from "@/components/domain/factor-view";
import { REMEASURE_DAYS } from "@/lib/remeasure";
import type { FitnessMapMember, Mission } from "@/lib/api/types";
import { useCheers, useLatestCoachRun, useLatestFitnessTest, useRestDays } from "@/lib/api/queries";
import { missionsOn } from "@/lib/day";
import { VERIFIED_COPY } from "@/lib/mission";
import { PHASE_LABEL, sessionsOf, totalMinutes } from "@/lib/session-plan";
import { daysSince, monthOf, today } from "@/lib/today";
import { cn, formatDate, withJosa } from "@/lib/utils";

/**
 * 부모 홈의 첫 묶음 — 「우리 아이」. 아이가 어디쯤인지와 오늘 무엇을 하는지를 한 덩어리로.
 *
 * 카드 하나에 기능 하나씩 쌓던 것(체력 · 다시 재기 · AI 제안 · 오늘 운동)을 합쳤다(9/25 「큰 묶음 둘」).
 * 육각형 바로 아래에 통합 신체 점수(9/25). 이름을 누르면 아이 기록(요인 표 · 점수 흐름 · 키)으로 간다.
 */
export function ChildPanel({
  child,
  familyId,
  parentProfileId,
  missions,
  missionsFailed,
  onRetryMissions,
}: {
  child: FitnessMapMember;
  familyId: string;
  parentProfileId: string;
  /** 아직 못 받았으면 undefined */
  missions: Mission[] | undefined;
  missionsFailed: boolean;
  onRetryMissions: () => void;
}) {
  const { data: latest, isPending } = useLatestFitnessTest(child.profileId);
  const name = child.name ?? "아이";
  const score = child.latest?.overallPercentile ?? null;
  const testedOn = child.latest?.testedOn ?? latest?.testedOn ?? null;
  const since = daysSince(testedOn);

  return (
    <section className="card-hero" aria-label={`${name}의 체력과 오늘 운동`}>
      <CardHead
        title={name}
        meta={testedOn ? `${formatDate(testedOn)} 측정` : undefined}
        href={`/parent/child/${child.profileId}`}
      />

      {/* 잰 적이 있는지로 가른다 — 만 7~10세는 규준이 비어 점수가 없을 수 있다(규칙 8). 그래도 육각형은 선다 */}
      {testedOn == null ? (
        <FirstMeasure child={child} />
      ) : (
        <>
          {/* 육각형 · 그 아래 통합 신체 점수 · 출처. 아이 기록 · 측정 결과와 같은 한 부품이다 */}
          <FactorView
            points={latest?.radar}
            name={name}
            pending={isPending}
            score={score}
            headline={child.headline}
            className="mx-auto mt-2 max-w-80"
          />
        </>
      )}

      {/* 한 달이 지나면 다시 재자고 말한다. 막지 않고, 오래됐다고 탓하지 않는다(규칙 11) */}
      {since != null && since >= REMEASURE_DAYS && (
        <PanelRow
          href={`/p/${child.profileId}/measure`}
          art="icon/menu-measure"
          title="키 · 몸무게를 새로 잴 때예요"
          note={`지난번에 잰 지 ${since}일`}
        />
      )}

      <div className="border-line mt-4 border-t pt-3">
        <TodaySection
          familyId={familyId}
          parentProfileId={parentProfileId}
          childProfileId={child.profileId ?? ""}
          childName={name}
          missions={missions}
          missionsFailed={missionsFailed}
          onRetryMissions={onRetryMissions}
        />
      </div>
    </section>
  );
}

/** 묶음 안의 한 줄 — 그림 · 제목 · 곁말 · › */
function PanelRow({
  href,
  art,
  title,
  note,
}: {
  href: string;
  art: string;
  title: string;
  note?: string | null;
}) {
  return (
    <NavLink
      href={href}
      className="press border-line mt-3 flex min-h-12 items-center gap-3 border-t pt-3"
    >
      <ArtIcon name={art} className="size-8" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold">{title}</span>
        {note && <span className="text-caption text-ink-soft block truncate">{note}</span>}
      </span>
      <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
    </NavLink>
  );
}

/**
 * 아이의 오늘 — 할 운동 · 칭찬 · 직접 적은 걸음수 · 기다리는 제안.
 * 아이가 다 했으면 여기가 **칭찬을 보내는 자리**다 — 알림을 받고 들어온 부모가 가장 먼저 보는 곳(규칙 12).
 */
function TodaySection({
  familyId,
  parentProfileId,
  childProfileId,
  childName,
  missions,
  missionsFailed,
  onRetryMissions,
}: {
  familyId: string;
  parentProfileId: string;
  childProfileId: string;
  childName: string;
  missions: Mission[] | undefined;
  missionsFailed: boolean;
  onRetryMissions: () => void;
}) {
  const { data: given } = useCheers(familyId, childProfileId);
  const { data: run } = useLatestCoachRun(familyId);
  // 쉬는 날 카드를 쓴 날 — 「아직 시작 전」 이 아니라 「쉬는 날」
  const { data: rest } = useRestDays(familyId, monthOf(today()));
  const stickerHref = (missionId?: string) =>
    `/parent/sticker/${childProfileId}${missionId ? `?missionId=${missionId}` : ""}`;

  const now = today();
  const restToday = Boolean(rest?.days.includes(now));
  const mine = missionsOn(missions, childProfileId, now);
  // 시간으로 재는 운동과 직접 적는 걸음수를 가른다. 걸음수는 서버가 모르는 값이다(규칙 2)
  const timed = mine.filter((m) => m.targetMetric !== "STEPS");
  const reported = mine.filter((m) => m.targetMetric === "STEPS");
  // 등록을 기다리는 제안. 등록해야 운동이 된다(규칙 1) — 여기서 말하지 않으면 아이 화면이 왜 빈지 모른다.
  // 이 아이의 제안일 때만 — 아이가 둘이면 첫째 제안이 둘째 칸에 뜨고 둘째의 「AI에게 받기」 를 가렸다.
  // 기간이 지난 제안은 뺀다 — 지난주 제안이 오늘의 「AI에게 받기」 를 가리지 않게
  const proposals = (run?.proposals ?? []).filter(
    (p) =>
      (p.endDate ?? p.startDate ?? now) >= now &&
      ((p.participants ?? []).length === 0 ||
        p.participants?.some((x) => x.profileId === childProfileId)),
  );
  const waiting =
    run?.status === "AWAITING_APPROVAL" && run.coachRunId && proposals.length > 0
      ? { id: run.coachRunId, title: proposals[0]?.title }
      : null;

  const head = (
    <CardHead
      title="오늘 운동"
      meta="하루 기록"
      href={`/calendar/${now}?profileId=${encodeURIComponent(childProfileId)}`}
    />
  );

  // 쉬는 날에는 운동을 권하지 않는다(규칙 15)
  const proposal = waiting && !restToday && (
    <PanelRow
      href={`/plan/${waiting.id}`}
      art="icon/menu-ai"
      title="AI 제안이 와 있어요"
      note={waiting.title ?? "오늘 운동 제안"}
    />
  );

  // 운동 목록을 못 받았으면 「아직 오늘 운동이 없어요」 로 그리지 않는다 — 부모가 같은 운동을 또 받는다
  if (!missions) {
    return (
      <>
        {head}
        {missionsFailed ? (
          <p className="text-ink-soft mt-1 flex items-center justify-between gap-3 text-sm">
            오늘 운동을 불러오지 못했어요
            <button
              type="button"
              onClick={onRetryMissions}
              className="press text-signal-strong min-h-11 shrink-0 px-1 font-extrabold"
            >
              다시 불러오기
            </button>
          </p>
        ) : (
          <div className="mt-1 space-y-2" aria-busy>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        )}
      </>
    );
  }

  if (timed.length === 0 && reported.length === 0) {
    return (
      <>
        {head}
        <p className="text-ink-soft mt-1 text-sm">
          {restToday
            ? "오늘은 쉬는 날이에요"
            : `${withJosa(childName, "은는")} 아직 오늘 운동이 없어요`}
        </p>
        {proposal}
        {/* 두 길 — AI에게 받거나, 직접 골라 짜거나. 쉬는 날에는 운동을 권하지 않는다(규칙 15) */}
        {!waiting && !restToday && (
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <Link
              href="/plan"
              className="press bg-signal-strong flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
            >
              <ArtIcon name="icon/menu-ai" className="size-5" />
              AI에게 운동 받기
            </Link>
            <Link
              href="/videos"
              className="press bg-sub flex min-h-12 items-center justify-center rounded-2xl px-4 text-sm font-extrabold"
            >
              직접 짜기
            </Link>
          </div>
        )}
      </>
    );
  }

  // 오늘 운동마다 — 끝냈나 · 칭찬을 붙였나. 칭찬은 운동마다다
  const items = timed.map((mission) => {
    const sessions = sessionsOf(mission, childProfileId);
    const done = sessions.filter((s) => s.completed).length;
    const me = mission.participants?.find((p) => p.profileId === childProfileId);
    return {
      mission,
      sessions,
      done,
      finished: Boolean(me?.completed) || (sessions.length > 0 && done === sessions.length),
      praised: (given?.cheers ?? []).some(
        (c) => c.fromProfileId === parentProfileId && c.missionId === mission.missionId,
      ),
    };
  });
  // 칭찬을 기다리는 운동이 먼저, 그다음 아직인 운동 — 둘째 운동이 첫째의 칭찬 단추를 가리지 않게
  const focus =
    items.find((i) => i.finished && !i.praised) ?? items.find((i) => !i.finished) ?? items[0];
  const main = focus?.mission;
  const sessions = focus?.sessions ?? [];
  const minutes = totalMinutes(sessions);
  const doneCount = focus?.done ?? 0;
  const finished = focus?.finished ?? false;
  const praisedToday = focus?.praised ?? false;
  const phases = (["WARMUP", "MAIN", "COOLDOWN"] as const)
    .map((p) => [p, sessions.filter((s) => s.phase === p).length] as const)
    .filter(([, n]) => n > 0)
    .map(([p, n]) => `${PHASE_LABEL[p].replace("운동", "")} ${n}`)
    .join(" · ");

  return (
    <>
      {head}
      {main && (
        <div className="mt-1">
          <p className="text-lead truncate font-extrabold">
            {main.title}
            {items.length > 1 && (
              <span className="text-ink-soft text-sm font-bold"> 외 {items.length - 1}개</span>
            )}
          </p>
          <p className="text-caption text-ink-soft mt-0.5">
            {sessions.length}개 · {minutes}분{phases && ` · ${phases}`}
          </p>
          <p
            className={cn(
              "text-caption mt-1.5 font-bold",
              finished ? "text-done" : "text-ink-soft",
            )}
          >
            {/* 한 만큼이 먼저 — 쉬는 날에 「그래도 할래요」 로 한 것을 「쉬는 날」 로 덮지 않는다 */}
            {finished
              ? `${withJosa(childName, "이가")} 다 했어요`
              : doneCount > 0
                ? `${doneCount}개 했어요 · ${sessions.length - doneCount}개 남음`
                : restToday
                  ? "오늘은 쉬는 날이에요"
                  : "아직 시작 전이에요"}
          </p>
        </div>
      )}

      {/* 다 했으면 칭찬. 보냈으면 보냈다고만 — 두 번 보내라고 조르지 않는다 */}
      {main && finished && (
        <div className="mt-3">
          {praisedToday ? (
            <p className="text-done flex min-h-11 items-center justify-center gap-1.5 text-sm font-bold">
              <Check aria-hidden className="size-4" strokeWidth={3} />
              오늘 스티커를 붙였어요
            </p>
          ) : (
            <Link
              href={stickerHref(main.missionId)}
              className="press bg-signal-strong flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-extrabold text-white"
            >
              칭찬 스티커 붙이기
            </Link>
          )}
        </div>
      )}

      {/* 직접 적은 걸음수 — 서버가 모르는 값이라 부모 확인이 남는다(규칙 2) */}
      {reported.map((m) => {
        const p = m.participants?.find((x) => x.profileId === childProfileId);
        return (
          <div key={m.missionId} className="border-line mt-3 flex items-center gap-3 border-t pt-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{m.title}</p>
              <p className="text-caption text-ink-soft mt-0.5">
                {p?.verifiedBy ? VERIFIED_COPY[p.verifiedBy] : "아직 안 적었어요"}
              </p>
            </div>
            {p?.needsGuardianCheck && (
              <Link
                href={stickerHref(m.missionId)}
                className="press bg-sub text-ink grid min-h-11 shrink-0 place-items-center rounded-xl px-3.5 text-xs font-extrabold"
              >
                확인해 주기
              </Link>
            )}
          </div>
        );
      })}

      {proposal}

      {/* 운동 더하기 — 오늘 운동이 있어도 AI 코치에게 더 받거나 직접 짜서 더한다(9/25 「운동 미션을 추가하는」).
          코치가 짠 것은 등록해야 운동이 된다(규칙 1) */}
      {!waiting && !restToday && (
        <div className="border-line mt-3 grid grid-cols-2 gap-2 border-t pt-3">
          <Link
            href="/plan"
            className="press bg-signal-soft text-signal-deep flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
          >
            <ArtIcon name="icon/menu-ai" className="size-5" />
            AI 코치에게 더 받기
          </Link>
          <Link
            href="/videos"
            className="press bg-sub flex min-h-11 items-center justify-center rounded-2xl text-sm font-extrabold"
          >
            직접 짜서 더하기
          </Link>
        </div>
      )}
    </>
  );
}
