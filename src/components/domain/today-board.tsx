"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import type { CheerLog, Mission } from "@/lib/api/types";
import { Illustration } from "@/components/ui/illustration";
import { StampPicker } from "@/components/domain/stamp-picker";
import { StampMark } from "@/components/domain/stamp-mark";
import { progressPercent, targetCopy } from "@/lib/mission";
import { useCheers } from "@/lib/api/queries";
import { cn, withJosa } from "@/lib/utils";

/**
 * 아이가 오늘 한 일 — **도장을 찍는 자리**.
 *
 * 두 갈래가 섞인다.
 *   1. 아이가 직접 알린 것   "다 했어요!" 를 누르면 여기로 온다
 *   2. 미션 진행            서버가 아는 값(영상 재생률 · 타이머)
 *
 * 처음엔 미션만 보고 있었는데, 아이가 미션 없이 권한 영상을 했을 때
 * 부모 화면에 아무것도 안 떴다. 아이는 알렸는데 부모는 못 보는 상태 —
 * 도장이 오지 않으니 아이는 다음부터 안 알린다.
 *
 * 아무것도 안 했을 때 "오늘 아무것도 안 했습니다" 라고 쓰지 않는다.
 * 그 말은 부모가 아이에게 옮기는 말이 된다.
 */
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
  // 아이가 나에게 보낸 알림 · 내가 아이에게 찍어 준 도장
  const { data: inbox } = useCheers(familyId, parentProfileId);
  const { data: given } = useCheers(familyId, childProfileId);
  const [picking, setPicking] = useState<{ mission: Mission | null } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = (c: CheerLog) => c.createdAt.slice(0, 10) === today;

  const told = (inbox?.cheers ?? [])
    .filter((c) => c.fromProfileId === childProfileId && isToday(c))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const stamps = (given?.cheers ?? [])
    .filter((c) => c.fromProfileId === parentProfileId && isToday(c))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  /*
    어느 알림에 답했는지 서버가 알려주지 않는다. 오래된 것부터 하나씩 짝지어
    "앞의 n개는 답했다" 로 본다. 새로고침해도 결과가 같다.
    ▲ 백엔드에 답장을 잇는 칸(replyToCheerId)을 요청해 뒀다.
  */
  const answeredCount = stamps.length;

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
            const stamp = answered ? (stamps[index]?.stamp ?? null) : null;
            return (
              <li key={cheer.cheerId} className="flex items-start gap-3 py-4">
                <span
                  className="bg-signal-soft text-signal-deep mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                  aria-hidden
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.95rem] leading-snug font-bold">{cheer.message}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      answered ? "text-faint" : "text-signal-deep font-bold",
                    )}
                  >
                    {answered
                      ? "도장을 찍어 줬어요"
                      : `${withJosa(childName, "이가")} 도장을 기다리고 있어요`}
                  </p>
                </div>
                {answered ? (
                  <StampMark stamp={stamp} size={44} />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setPicking({
                        mission: mine.find((m) => m.missionId === cheer.missionId) ?? null,
                      })
                    }
                    className="press bg-signal shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold text-white"
                  >
                    도장 찍기
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 미션 진행 — 서버가 아는 값 */}
      {mine.length > 0 && (
        <ul className="divide-rows">
          {mine.map((mission) => {
            const me = mission.participants?.find((p) => p.profileId === childProfileId);
            const percent = progressPercent(me?.progress);
            const done = me?.completed ?? false;

            return (
              <li key={mission.missionId} className="py-4">
                <div className="flex items-start gap-3">
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
                    <p className="text-[0.95rem] font-bold">{mission.title}</p>
                    <p className="text-ink-soft mt-0.5 text-xs">
                      {targetCopy(mission.targetMetric, mission.targetValue)}
                      <span className="text-faint"> · {percent}%</span>
                    </p>
                    <div className="record-rail mt-1.5">
                      <span className="record-fill" style={{ width: `${percent}%` }} aria-hidden />
                    </div>
                  </div>
                  {me?.needsGuardianCheck && (
                    <button
                      type="button"
                      onClick={() => setPicking({ mission })}
                      className="press bg-signal shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold text-white"
                    >
                      확인해 주기
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <StampPicker
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
