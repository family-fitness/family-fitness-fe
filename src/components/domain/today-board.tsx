"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import type { Mission } from "@/lib/api/types";
import { Illustration } from "@/components/ui/illustration";
import { StampPicker } from "@/components/domain/stamp-picker";
import { StampMark } from "@/components/domain/stamp-mark";
import { progressPercent, targetCopy } from "@/lib/mission";
import { useCheers } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

/**
 * 아이가 오늘 한 일.
 *
 * **여기가 도장을 찍는 자리다.** 아이는 운동을 마치고 기다리고 있다.
 * 부모가 여기서 도장을 찍으면 아이 화면에 나타난다.
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
  const { data: cheerLog } = useCheers(familyId, childProfileId);
  const [picking, setPicking] = useState<Mission | null>(null);

  const mine = (missions ?? []).filter((m) =>
    m.participants?.some((p) => p.profileId === childProfileId),
  );
  const started = mine.filter((m) => {
    const me = m.participants?.find((p) => p.profileId === childProfileId);
    return (me?.progress ?? 0) > 0 || me?.completed;
  });

  /** 이 미션에 이미 도장을 찍었는지 */
  const stampFor = (missionId: string | undefined) =>
    cheerLog?.cheers.find((c) => c.missionId === missionId)?.stamp ?? null;

  if (mine.length === 0) {
    return (
      <div className="border-line flex items-center gap-3 rounded-2xl border border-dashed p-4">
        <Illustration name="scene/scene-rest-day" fallback="scene/scene-no-mission" size={52} />
        <p className="text-ink-soft text-sm leading-relaxed">
          오늘은 정해진 운동이 없어요. 쉬는 것도 하는 일이에요.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-rows">
        {mine.map((mission) => {
          const me = mission.participants?.find((p) => p.profileId === childProfileId);
          const percent = progressPercent(me?.progress);
          const stamp = stampFor(mission.missionId);
          const done = me?.completed ?? false;
          const waiting = (me?.progress ?? 0) > 0 && !stamp;

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

                {stamp ? (
                  <StampMark stamp={stamp} size={44} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPicking(mission)}
                    disabled={(me?.progress ?? 0) === 0}
                    className={cn(
                      "press shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold",
                      (me?.progress ?? 0) > 0
                        ? "bg-signal text-white"
                        : "border-line text-faint border",
                    )}
                  >
                    도장 찍기
                  </button>
                )}
              </div>

              {waiting && (
                <p className="text-signal-deep mt-2 ml-11 text-xs font-bold">
                  {childName}이 도장을 기다리고 있어요
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {started.length === 0 && (
        <p className="text-faint mt-2 text-xs leading-relaxed">
          아이가 운동을 시작하면 여기에 나타나요. 마치면 도장을 찍어 줄 수 있어요.
        </p>
      )}

      <StampPicker
        open={Boolean(picking)}
        onClose={() => setPicking(null)}
        familyId={familyId}
        fromProfileId={parentProfileId}
        toProfileId={childProfileId}
        toName={childName}
        mission={picking}
      />
    </>
  );
}
