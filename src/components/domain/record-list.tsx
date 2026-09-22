"use client";

import Link from "next/link";

import type { Mission } from "@/lib/api/types";
import { VERIFIED_COPY, progressPercent, targetCopy } from "@/lib/mission";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * 최근 기록 목록.
 *
 * 전적 사이트의 경기 목록에서 가져온 모양이다 — 줄마다 **왼쪽에 색 띠**가 있고,
 * 그 색이 결과를 한눈에 말한다. 우리는 이겼다/졌다가 아니라 **무엇으로 확인된
 * 기록인가**를 말한다. 앱이 직접 본 것과 사람이 적은 것은 다른 기록이다.
 *
 * 색으로 잘잘못을 말하지 않는다 — 초록은 "해냈다" 뿐이고 못 한 것은 회색이다.
 */
export function RecordList({
  missions,
  profileId,
  limit,
}: {
  missions: Mission[];
  /** 이 사람 기준으로 진행률과 확인 방법을 읽는다 */
  profileId: string;
  limit?: number;
}) {
  const rows = (limit ? missions.slice(0, limit) : missions).map((mission) => {
    const me = mission.participants?.find((p) => p.profileId === profileId);
    return { mission, me };
  });

  if (rows.length === 0) return null;

  return (
    <ul className="divide-rows">
      {rows.map(({ mission, me }) => {
        const done = me?.completed ?? false;
        const verified = me?.verifiedBy ?? null;
        const percent = progressPercent(me?.progress);
        // 앱이 직접 본 기록인가, 사람이 적은 값인가
        const bySelf = verified === "SELF_REPORT";

        return (
          <li key={mission.missionId}>
            <Link
              href={`/missions/${mission.missionId}`}
              className="press flex items-stretch gap-3 py-3"
            >
              <span
                aria-hidden
                className={cn(
                  "w-1 shrink-0 rounded-full",
                  done && !bySelf ? "bg-done" : done ? "bg-mark" : "bg-line",
                )}
              />

              <span className="min-w-0 flex-1">
                <span className="text-body line-clamp-1 font-bold">{mission.title}</span>
                <span className="text-faint text-caption mt-0.5 flex flex-wrap items-center gap-x-1.5">
                  <span>{targetCopy(mission.targetMetric, mission.targetValue)}</span>
                  {mission.endDate && <span>· {formatDate(mission.endDate)}</span>}
                  {verified && <span>· {VERIFIED_COPY[verified]}</span>}
                </span>
              </span>

              <span className="shrink-0 self-center text-right">
                {done ? (
                  <span
                    className={cn(
                      "text-caption font-extrabold",
                      bySelf ? "text-ink-soft" : "text-done",
                    )}
                  >
                    {bySelf ? "직접 입력" : "확인됨"}
                  </span>
                ) : me?.needsGuardianCheck ? (
                  /*
                    목표에 닿았지만 아직 완료가 아니다. 여기에 100% 만 적으면
                    다 한 것처럼 보인다 — 무엇이 남았는지가 이 줄의 뜻이다.
                  */
                  <span className="text-signal-deep text-caption font-extrabold">확인 기다림</span>
                ) : (
                  <span className="board-num text-ink-soft text-base leading-none">{percent}%</span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
