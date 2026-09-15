"use client";

import { Check, Play, Timer, Footprints } from "lucide-react";
import Link from "next/link";

import type { Mission, MissionParticipant } from "@/lib/api/types";
import { VERIFIED_COPY, progressPercent, serverKnows, targetCopy } from "@/lib/mission";
import { cn, formatDate } from "@/lib/utils";

const METRIC_ICON = {
  VIDEO_DONE: Play,
  TIMER_MINUTES: Timer,
  STEPS: Footprints,
} as const;

/**
 * 미션 하나.
 *
 * 구성원마다 진행도를 따로 보여준다. 미션은 가족이 같이 하는 것이라
 * 하나의 막대로 합치면 누가 하고 누가 안 했는지가 사라진다.
 *
 * **무엇으로 확인된 값인지 항상 붙인다.** 걸음수는 사람이 적은 값이다.
 * 거기에 "자동 인증" 이라고 쓰면 사실이 아니고, 심사에서 무너진다.
 */
export function MissionRow({ mission }: { mission: Mission }) {
  const Icon = METRIC_ICON[mission.targetMetric ?? "TIMER_MINUTES"] ?? Timer;
  const participants = mission.participants ?? [];
  const allDone = participants.length > 0 && participants.every((p) => p.completed);

  return (
    <li>
      <Link href={`/missions/${mission.missionId}`} className="press block py-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
              allDone ? "bg-done-soft text-done" : "bg-signal-soft text-signal-deep",
            )}
            aria-hidden
          >
            {allDone ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" />}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-[0.98rem] leading-snug font-extrabold">{mission.title}</h3>
            <p className="text-ink-soft mt-0.5 text-xs font-semibold">
              {targetCopy(mission.targetMetric, mission.targetValue)}
              {mission.endDate && (
                <span className="text-faint"> · {formatDate(mission.endDate)}까지</span>
              )}
            </p>
          </div>
        </div>

        <ul className="mt-3 ml-12 space-y-2.5">
          {participants.map((p) => (
            <ParticipantProgress key={p.profileId} participant={p} />
          ))}
        </ul>
      </Link>
    </li>
  );
}

export function ParticipantProgress({ participant }: { participant: MissionParticipant }) {
  const percent = progressPercent(participant.progress);

  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.8rem] font-bold">{participant.name}</span>
        <span className="tabular text-faint text-[0.7rem]">{percent}%</span>
      </div>
      <div className="record-rail mt-1">
        <span className="record-fill" style={{ width: `${percent}%` }} aria-hidden />
      </div>
      <VerifyLabel participant={participant} />
    </li>
  );
}

/**
 * 무엇으로 확인됐는지 한 줄.
 *
 * 서버가 아는 것(영상 재생률 · 타이머)과 사람이 적은 것(걸음수)을 같은 말로
 * 쓰지 않는다. 이 구분이 이 서비스가 정직하다는 유일한 증거다.
 */
export function VerifyLabel({ participant }: { participant: MissionParticipant }) {
  if (participant.needsGuardianCheck) {
    return (
      <p className="text-signal-deep mt-1 text-[0.7rem] font-bold">
        목표에 닿았어요 · 부모 확인이 남았어요
      </p>
    );
  }
  if (!participant.verifiedBy) {
    return <p className="text-faint mt-1 text-[0.7rem]">아직 기록이 없어요</p>;
  }
  return (
    <p
      className={cn(
        "mt-1 text-[0.7rem]",
        serverKnows(participant.verifiedBy) ? "text-done font-bold" : "text-ink-soft",
      )}
    >
      {VERIFIED_COPY[participant.verifiedBy]}
    </p>
  );
}
