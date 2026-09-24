import { VideoThumb } from "@/components/ui/video-thumb";
import type { MissionSession } from "@/lib/api/types";
import { PHASE_LABEL } from "@/lib/session-plan";

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
              {g.rows.reduce((sum, s) => sum + (s.minutes ?? 0), 0)}분
            </span>
          </p>
          <ul className="mt-1.5 space-y-2">
            {g.rows.map((s) => (
              <li key={s.position} className="flex items-center gap-3">
                {s.clip?.videoId ? (
                  <VideoThumb
                    videoId={s.clip.videoId}
                    className="aspect-video w-24 shrink-0 rounded-xl"
                  />
                ) : (
                  <span className="bg-sub text-caption text-ink-soft grid aspect-video w-24 shrink-0 place-items-center rounded-xl">
                    영상 없음
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{s.title}</span>
                  <span className="text-caption text-ink-soft block">
                    {s.factor ? `${s.factor} · ` : ""}
                    {s.minutes ?? 1}분
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
