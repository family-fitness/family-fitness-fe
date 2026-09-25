import type { ProgressView } from "@/lib/api/types";
import { levelProgress } from "@/lib/levels";
import { cn } from "@/lib/utils";

/**
 * 경험치 게이지 — 「다음 레벨까지 N · 경험치 60 / 80」 아래에 채워지는 막대(9/25 「다음 레벨까지 ~~ 아래 경험치 게이지 바」).
 *
 * 게임의 경험치 바처럼 두껍고, 비어 있어도 칸이 보인다 — 옅은 파랑 바탕은 경험치가 적을 때 막대가 있는지도 몰랐다.
 * 숫자는 이번 레벨 안에서 모은 것 / 이번 레벨에 필요한 것. 아이 홈 · 레벨과 업적 · 운동 끝 화면이 같은 게이지를 쓴다.
 * 경험치는 줄지 않는다(규칙 10) — 막대는 차오르기만 한다.
 */
export function XpGauge({
  progress,
  track = "bg-deep-soft",
  className,
}: {
  progress: Pick<ProgressView, "xp" | "levelFloorXp" | "nextLevelXp">;
  /** 게이지 바탕 — 회색 칸(bg-sub) 안에 설 때는 흰 바탕 */
  track?: string;
  className?: string;
}) {
  const bar = levelProgress(progress);
  const span = progress.nextLevelXp != null ? progress.nextLevelXp - progress.levelFloorXp : null;
  const into = Math.max(0, progress.xp - progress.levelFloorXp);
  const pct = Math.round(bar.ratio * 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-caption font-extrabold">
          {bar.left == null ? "가장 높은 레벨이에요" : `다음 레벨까지 ${bar.left}`}
        </p>
        {span != null && (
          <p className="text-micro text-ink-soft font-bold tabular-nums">
            경험치 {into} / {span}
          </p>
        )}
      </div>
      <div
        className={cn("mt-1.5 h-3 overflow-hidden rounded-full", track)}
        role="progressbar"
        aria-label="경험치"
        aria-valuemin={0}
        aria-valuemax={span ?? 1}
        aria-valuenow={span != null ? Math.min(into, span) : 1}
      >
        <span
          className="bg-signal block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
