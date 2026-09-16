"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTimerStore } from "@/stores/timer-store";

/** 앱 안에서 도는 타이머. */
export function MissionTimer({
  missionId,
  onFinish,
  pending,
}: {
  missionId: string;
  /** 실제 경과 분(1분 미만은 0). 서버에 보낼 값이다 */
  onFinish: (args: { startedAt: string; endedAt: string; activeMinutes: number }) => void;
  pending?: boolean;
}) {
  const startedAt = useTimerStore((s) => s.startedAt[missionId]);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);

  // 경과 시간을 상태에 두지 않는다. 지금 시각만 흐르게 하고 경과는 렌더에서 뺀다 —
  // 효과 안에서 곧바로 setState 하면 렌더가 한 번 더 돈다
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const elapsed = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="board-num text-[3.6rem] leading-none tabular-nums" aria-live="polite">
        {minutes}:{seconds}
      </p>

      {startedAt ? (
        <Button
          size="block"
          variant="outline"
          loading={pending}
          onClick={() => {
            const endedAt = new Date().toISOString();
            const activeMinutes = Math.floor(
              (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
            );
            stop(missionId);
            // 1분이 안 되면 보낼 값이 없다. 서버가 1~180 만 받는다
            if (activeMinutes >= 1) onFinish({ startedAt, endedAt, activeMinutes });
          }}
        >
          <Pause className="size-4" aria-hidden />
          그만하기
        </Button>
      ) : (
        <Button size="block" onClick={() => start(missionId)}>
          <Play className="size-4 fill-current" aria-hidden />
          시작하기
        </Button>
      )}

      {startedAt && elapsed < 60 && (
        <p className="text-faint text-xs">1분이 지나야 기록으로 남아요</p>
      )}
    </div>
  );
}
