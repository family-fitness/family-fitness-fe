"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { VideoThumb } from "@/components/ui/video-thumb";
import type { MissionSession } from "@/lib/api/types";
import { PHASE_LABEL, stepMinutes } from "@/lib/session-plan";
import { cn } from "@/lib/utils";
import { exerciseLine, sessionHref } from "@/lib/videos";

/**
 * 동작 목록. 하는 차례대로 칸마다 썸네일, 이름, 한 줄 설명, 단계와 시간.
 *
 * 오늘 운동 제안(`plan/[runId]`)과 하루 기록의 칸과 같은 모양이다. 영상이 있는 칸은 누르면 운동 상세로 간다.
 * 영상이 없는 칸은 썸네일 자리를 비워 두고 누를 수 없다. 지어내지 않는다.
 * 동작이 많으면 처음 `limit` 개만 보이고 「모두 보기」 로 펼친다.
 * 파랑 큰 카드 안에서는 `onSignal` 로 글자를 희게 한다.
 */
export function SessionList({
  sessions,
  limit = 4,
  onSignal = false,
  className,
}: {
  sessions: MissionSession[];
  limit?: number;
  onSignal?: boolean;
  className?: string;
}) {
  const [all, setAll] = useState(false);
  if (sessions.length === 0) return null;
  const rows = all ? sessions : sessions.slice(0, limit);
  const soft = onSignal ? "text-white" : "text-ink-soft";

  return (
    <div className={className}>
      <ul className="space-y-2" aria-label="동작 목록">
        {rows.map((s) => {
          const href = sessionHref(s);
          const row = (
            <>
              {s.clip?.videoId ? (
                <VideoThumb
                  videoId={s.clip.videoId}
                  src={s.clip.thumbnailUrl}
                  className="aspect-video w-24 shrink-0 rounded-xl"
                />
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    "aspect-video w-24 shrink-0 rounded-xl",
                    onSignal ? "bg-white/15" : "bg-sub",
                  )}
                />
              )}
              <span className="min-w-0 flex-1">
                {/* 동작 이름은 두 줄까지 — 「척추 들어올리기 (고양…」 처럼 무슨 동작인지가 잘렸다 */}
                <span className="line-clamp-2 text-sm font-bold">{s.title}</span>
                <span className={cn("text-caption mt-0.5 block truncate", soft)}>
                  {exerciseLine(s)}
                </span>
                <span className={cn("text-caption block", soft)}>
                  {PHASE_LABEL[s.phase]} {stepMinutes(s)}분
                </span>
              </span>
              {s.completed && (
                <Check
                  role="img"
                  aria-label="했어요"
                  className={cn("size-5 shrink-0", onSignal ? "text-white" : "text-done")}
                  strokeWidth={3}
                />
              )}
            </>
          );
          return (
            <li key={`${s.position}-${s.title}`}>
              {href ? (
                <Link href={href} className="press flex items-center gap-3">
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-3">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
      {sessions.length > limit && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className={cn(
            "press mt-2 flex min-h-11 w-full items-center justify-center rounded-2xl text-sm font-extrabold",
            onSignal ? "bg-white/15" : "bg-sub",
          )}
        >
          {all ? "접기" : `모두 보기 (${sessions.length}개)`}
        </button>
      )}
    </div>
  );
}
