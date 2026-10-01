import Link from "next/link";

import { VideoThumb } from "@/components/ui/video-thumb";
import type { MissionSession } from "@/lib/api/types";
import { PHASE_LABEL, stepMinutes, totalMinutes } from "@/lib/session-plan";
import { sessionHref } from "@/lib/videos";

/**
 * 칸 목록 — 준비 · 본 · 정리로 묶어서.
 *
 * AI 편성 제안과 직접 짠 루틴이 같은 모양으로 보인다. 칸마다 시범 영상 썸네일 · 동작
 * 이름 · 잡힌 시간. 영상이 없는 칸은 썸네일 자리를 비워 둔다 — 지어내지 않는다.
 */
export function SessionList({ sessions }: { sessions: MissionSession[] }) {
  const groups = (["WARMUP", "MAIN", "COOLDOWN"] as const)
    .map((phase) => ({ phase, rows: sessions.filter((s) => s.phase === phase) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.phase}>
          <p className="text-caption text-ink-soft font-extrabold">
            {PHASE_LABEL[g.phase]}
            <span className="text-faint ml-1 font-bold">
              {/* 칸 줄과 같은 셈 — 시간이 없는 칸은 1분(운동하기도 1분으로 돈다) */}
              {totalMinutes(g.rows)}분
            </span>
          </p>
          <ul className="mt-1.5 space-y-2">
            {g.rows.map((s) => {
              // 영상이 있는 칸은 누르면 운동 상세(영상과 설명)로
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
                    <span aria-hidden className="bg-sub aspect-video w-24 shrink-0 rounded-xl" />
                  )}
                  <span className="min-w-0 flex-1">
                    {/* 동작 이름은 두 줄까지 — 「척추 들어올리기 (고양…」 처럼 무슨 동작인지가 잘렸다 */}
                    <span className="line-clamp-2 text-sm font-bold">{s.title}</span>
                    <span className="text-caption text-ink-soft block">
                      {s.factor && <span className="mr-2">{s.factor}</span>}
                      {stepMinutes(s)}분
                    </span>
                  </span>
                </>
              );
              return (
                <li key={s.position}>
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
        </div>
      ))}
    </div>
  );
}
