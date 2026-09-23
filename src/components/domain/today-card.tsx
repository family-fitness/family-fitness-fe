"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Card, CardHead } from "@/components/ui/card";
import { TodayRings } from "@/components/domain/today-rings";
import type { DayLog, Mission } from "@/lib/api/types";
import { useCheers } from "@/lib/api/queries";
import { VERIFIED_COPY } from "@/lib/mission";
import { PHASE_LABEL, sessionsOf, totalMinutes } from "@/lib/session-plan";
import { dayOf, today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";
import { ArtIcon } from "@/components/ui/art-icon";

/**
 * 부모 홈 — 아이의 오늘.
 *
 * 링 셋이 "오늘 얼마나 · 몇 개 · 이번 주 며칠" 을 말한다(애플 피트니스의 링).
 * 아이 홈과 같은 링이다 — 같은 날을 두 화면이 다르게 세지 않는다.
 * 아이가 다 했으면 이 카드가 **칭찬을 보내는 자리**가 된다 — 알림을 받고
 * 들어온 부모가 가장 먼저 보는 곳이다(규칙 12).
 */
export function TodayCard({
  familyId,
  parentProfileId,
  childProfileId,
  childName,
  missions,
  weekLogs,
}: {
  familyId: string;
  parentProfileId: string;
  childProfileId: string;
  childName: string;
  missions: Mission[] | undefined;
  /** 이번 주 기록. 링이 오늘 칸과 이번 주를 같이 본다 */
  weekLogs: DayLog[] | undefined;
}) {
  const { data: given } = useCheers(familyId, childProfileId);
  const stickerHref = (missionId?: string) =>
    `/parent/sticker/${childProfileId}${missionId ? `?missionId=${missionId}` : ""}`;

  const now = today();
  const mine = (missions ?? []).filter(
    (m) =>
      (m.startDate ?? "") <= now &&
      now <= (m.endDate ?? "") &&
      m.participants?.some((p) => p.profileId === childProfileId),
  );

  // 시간으로 재는 운동과 직접 적는 걸음수를 가른다. 걸음수는 링에 넣지 않는다(규칙 2)
  const timed = mine.filter((m) => m.targetMetric !== "STEPS");
  const reported = mine.filter((m) => m.targetMetric === "STEPS");

  const rings = (
    <TodayRings
      profileId={childProfileId}
      missions={missions}
      weekLogs={weekLogs}
      size={112}
      className="mt-2"
    />
  );

  if (mine.length === 0) {
    return (
      <Card>
        <CardHead title="오늘 운동" meta={childName} />
        {rings}
        <p className="text-ink-soft border-line mt-4 border-t pt-3 text-sm">
          {withJosa(childName, "은는")} 아직 오늘 운동이 없어요
        </p>
        <Link
          href="/plan"
          className="press bg-signal-strong mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
        >
          <ArtIcon name="icon/menu-ai" className="size-5" />
          AI 에게 오늘 운동 받기
        </Link>
      </Card>
    );
  }

  const main = timed[0];
  const sessions = main ? sessionsOf(main) : [];
  const minutes = totalMinutes(sessions);
  const doneCount = sessions.filter((s) => s.completed).length;
  const me = main?.participants?.find((p) => p.profileId === childProfileId);
  const finished = Boolean(me?.completed) || (sessions.length > 0 && doneCount === sessions.length);

  const praisedToday = (given?.cheers ?? []).some(
    (c) => c.fromProfileId === parentProfileId && c.missionId && dayOf(c.createdAt) === now,
  );

  const phases = (["WARMUP", "MAIN", "COOLDOWN"] as const)
    .map((p) => [p, sessions.filter((s) => s.phase === p).length] as const)
    .filter(([, n]) => n > 0)
    .map(([p, n]) => `${PHASE_LABEL[p].replace("운동", "")} ${n}`)
    .join(" · ");

  return (
    <Card>
      <CardHead title="오늘 운동" meta={childName} />
      {rings}

      {main && (
        <div className="border-line mt-4 border-t pt-3">
          <p className="text-lead truncate font-extrabold">{main.title}</p>
          <p className="text-caption text-ink-soft mt-0.5">
            {sessions.length}개 · {minutes}분{phases && ` · ${phases}`}
          </p>
          <p
            className={cn(
              "text-caption mt-1.5 font-bold",
              finished ? "text-done" : "text-ink-soft",
            )}
          >
            {finished
              ? `${withJosa(childName, "이가")} 다 했어요`
              : doneCount > 0
                ? `${doneCount}개 했어요 · ${sessions.length - doneCount}개 남음`
                : "아직 시작 전이에요"}
          </p>
        </div>
      )}

      {/* 다 했으면 칭찬. 보냈으면 보냈다고만 — 두 번 보내라고 조르지 않는다 */}
      {main && finished && (
        <div className="mt-3">
          {praisedToday ? (
            <p className="bg-done-soft text-done flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold">
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
    </Card>
  );
}
