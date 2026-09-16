"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { CheerLog, Mission } from "@/lib/api/types";
import { Illustration } from "@/components/ui/illustration";
import { PraisePicker } from "@/components/domain/praise-picker";
import { progressPercent, targetCopy } from "@/lib/mission";
import { useCheers } from "@/lib/api/queries";
import { cn, withJosa } from "@/lib/utils";

/** 아이가 오늘 한 일 — **칭찬을 보내는 자리**. */
export function TodayBoard({
  familyId,
  childProfileId,
  childName,
  parentProfileId,
  missions,
}: {
  familyId: string;
  childProfileId: string;
  childName: string;
  parentProfileId: string;
  missions: Mission[] | undefined;
}) {
  // 아이가 나에게 보낸 알림 · 내가 아이에게 보낸 칭찬
  const { data: inbox } = useCheers(familyId, parentProfileId);
  const { data: given } = useCheers(familyId, childProfileId);
  const [picking, setPicking] = useState<{ mission: Mission | null } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = (c: CheerLog) => c.createdAt.slice(0, 10) === today;

  const told = (inbox?.cheers ?? [])
    .filter((c) => c.fromProfileId === childProfileId && isToday(c))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const praises = (given?.cheers ?? [])
    .filter((c) => c.fromProfileId === parentProfileId && isToday(c))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  /**
   * 어느 알림에 답했는지 서버가 모른다. 오래된 것부터 하나씩 짝지어 센다.
   * ▲ 백엔드에 replyToCheerId 를 요청해 뒀다.
   */
  const answeredCount = praises.length;

  const mine = (missions ?? []).filter((m) =>
    m.participants?.some((p) => p.profileId === childProfileId),
  );

  const nothingYet = told.length === 0 && mine.length === 0;

  if (nothingYet) {
    return (
      <div className="border-line flex items-center gap-3 rounded-2xl border border-dashed p-4">
        <Illustration name="scene/scene-rest-day" fallback="scene/scene-no-mission" size={52} />
        <p className="text-ink-soft text-sm leading-relaxed">
          오늘은 아직 소식이 없어요. 쉬는 것도 하는 일이에요.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 아이가 알린 것부터. 기다리고 있는 쪽이 먼저다 */}
      {told.length > 0 && (
        <ul className="divide-rows mb-2">
          {told.map((cheer, index) => {
            const answered = index < answeredCount;
            const reply = answered ? (praises[index]?.message ?? null) : null;
            return (
              <li key={cheer.cheerId} className="flex items-start gap-3 py-4">
                <span
                  className="bg-signal-soft text-signal-deep mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                  aria-hidden
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body leading-snug font-bold">{cheer.message}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs leading-relaxed",
                      answered ? "text-faint" : "text-signal-deep font-bold",
                    )}
                  >
                    {answered
                      ? `“${reply}” 라고 보냈어요`
                      : `${withJosa(childName, "이가")} 기다리고 있어요`}
                  </p>
                </div>
                {!answered && (
                  <button
                    type="button"
                    onClick={() =>
                      setPicking({
                        mission: mine.find((m) => m.missionId === cheer.missionId) ?? null,
                      })
                    }
                    className="press bg-signal shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold text-white"
                  >
                    칭찬하기
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 미션 진행 — 서버가 아는 값. 눌러서 부모가 같이 해도 된다 */}
      {mine.length > 0 && (
        <ul className="divide-rows">
          {mine.map((mission) => {
            const me = mission.participants?.find((p) => p.profileId === childProfileId);
            const percent = progressPercent(me?.progress);
            const done = me?.completed ?? false;

            return (
              <li key={mission.missionId}>
                {/** 누가 눌러도 같은 화면으로 간다. */}
                <Link
                  href={`/kid/play/${mission.missionId}`}
                  className="press flex items-start gap-3 py-4"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                      done ? "bg-done-soft text-done" : "bg-sub text-faint",
                    )}
                    aria-hidden
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-bold">{mission.title}</p>
                    <p className="text-ink-soft mt-0.5 text-xs">
                      {targetCopy(mission.targetMetric, mission.targetValue)}
                      <span className="text-faint"> · {percent}%</span>
                    </p>
                    <div className="record-rail mt-1.5">
                      <span className="record-fill" style={{ width: `${percent}%` }} aria-hidden />
                    </div>
                  </div>
                  {me?.needsGuardianCheck ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setPicking({ mission });
                      }}
                      className="press bg-signal shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold text-white"
                    >
                      확인해 주기
                    </button>
                  ) : (
                    <ChevronRight className="text-faint mt-1.5 size-4 shrink-0" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <PraisePicker
        open={Boolean(picking)}
        onClose={() => setPicking(null)}
        familyId={familyId}
        fromProfileId={parentProfileId}
        toProfileId={childProfileId}
        toName={childName}
        mission={picking?.mission ?? null}
      />
    </>
  );
}
