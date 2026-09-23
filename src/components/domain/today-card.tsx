"use client";

import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Card, CardHead } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { PraisePicker } from "@/components/domain/praise-picker";
import type { DayLog, Mission } from "@/lib/api/types";
import { useCheers } from "@/lib/api/queries";
import { VERIFIED_COPY } from "@/lib/mission";
import { PHASE_LABEL, sessionsOf, totalMinutes } from "@/lib/session-plan";
import { dayOf, today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";

/**
 * 부모 홈 — 아이의 오늘.
 *
 * 링 하나가 "오늘 잡힌 시간 중 얼마나" 를 말한다(애플 피트니스의 링).
 * 아이가 다 했으면 이 카드가 **칭찬을 보내는 자리**가 된다 — 알림을 받고
 * 들어온 부모가 가장 먼저 보는 곳이다(규칙 12).
 */
export function TodayCard({
  familyId,
  parentProfileId,
  childProfileId,
  childName,
  missions,
  todayLog,
}: {
  familyId: string;
  parentProfileId: string;
  childProfileId: string;
  childName: string;
  missions: Mission[] | undefined;
  todayLog: DayLog | undefined;
}) {
  const [picking, setPicking] = useState<{ mission: Mission | null } | null>(null);
  const { data: given } = useCheers(familyId, childProfileId);

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

  if (mine.length === 0) {
    return (
      <Card>
        <CardHead title="오늘 운동" />
        <p className="text-ink-soft mt-1 text-sm">
          {withJosa(childName, "은는")} 아직 오늘 운동이 없어요
        </p>
        <Link
          href="/coach/weekly"
          className="press bg-signal-strong mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
        >
          <Sparkles aria-hidden className="size-4" />
          AI 에게 오늘 운동 받기
        </Link>
      </Card>
    );
  }

  const main = timed[0];
  const sessions = main ? sessionsOf(main) : [];
  const planned = todayLog?.plannedMinutes ?? (main ? totalMinutes(sessions) : 0);
  const moved = todayLog?.minutes ?? 0;
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
      <CardHead title="오늘 운동" meta={`${childName}`} />

      {main && (
        <div className="mt-2 flex items-center gap-4">
          <Ring
            value={moved}
            max={planned || 1}
            size={76}
            stroke={9}
            label={`오늘 ${planned}분 중 ${moved}분`}
          >
            <span className="text-center leading-none">
              <span className="block text-lg font-extrabold">{moved}</span>
              <span className="text-micro text-ink-soft font-bold">/{planned}분</span>
            </span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-lead truncate font-extrabold">{main.title}</p>
            <p className="text-caption text-ink-soft mt-0.5">
              {sessions.length}칸 · {planned}분{phases && ` · ${phases}`}
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
                  ? `${doneCount}칸 했어요 · ${sessions.length - doneCount}칸 남음`
                  : "아직 시작 전이에요"}
            </p>
          </div>
        </div>
      )}

      {/* 다 했으면 칭찬. 보냈으면 보냈다고만 — 두 번 보내라고 조르지 않는다 */}
      {main && finished && (
        <div className="mt-3">
          {praisedToday ? (
            <p className="bg-done-soft text-done flex min-h-11 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold">
              <Check aria-hidden className="size-4" strokeWidth={3} />
              오늘 칭찬을 보냈어요
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setPicking({ mission: main })}
              className="press bg-signal-strong flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-extrabold text-white"
            >
              칭찬 보내기
            </button>
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
              <button
                type="button"
                onClick={() => setPicking({ mission: m })}
                className="press bg-sub text-ink grid min-h-11 shrink-0 place-items-center rounded-xl px-3.5 text-xs font-extrabold"
              >
                확인해 주기
              </button>
            )}
          </div>
        );
      })}

      <PraisePicker
        open={Boolean(picking)}
        onClose={() => setPicking(null)}
        familyId={familyId}
        fromProfileId={parentProfileId}
        toProfileId={childProfileId}
        toName={childName}
        mission={picking?.mission ?? null}
      />
    </Card>
  );
}
