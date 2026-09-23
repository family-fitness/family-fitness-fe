"use client";

import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { RepGame } from "@/components/domain/rep-game";
import { YouTubePlayer } from "@/components/domain/youtube-player";
import type { MissionSession } from "@/lib/api/types";
import { useRecordTimer, useRecordVideoProgress } from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { PHASE_LABEL, clipProgress, clipRange, clipSeconds, isClipDone } from "@/lib/session-plan";
import { cn } from "@/lib/utils";

/**
 * 세션 하나를 하는 곳.
 *
 * 하는 방법이 둘이다 — **구간 영상**을 보거나, 영상이 없으면 타이머·세기로 한다.
 * 어느 쪽이든 **무엇으로 확인했는지**가 기록에 남는다(도메인 규칙 2).
 *
 * 구간 완주는 **구간 길이의 90%** 다. 영상 전체가 아니다 — 12분짜리의 90초
 * 구간만 하는 아이가 영원히 완주에 못 닿던 것이 그 때문이었다.
 */
export function SessionRunner({
  session,
  missionId,
  familyId,
  childProfileId,
  onBack,
  onDone,
}: {
  session: MissionSession;
  missionId?: string;
  familyId: string;
  childProfileId: string;
  onBack: () => void;
  /** 끝났을 때. 기록이 안 남았으면 그 이유를 한 줄 넘긴다 */
  onDone: (note?: string) => void;
}) {
  const clip = session.clip ?? null;
  const hasVideo = Boolean(clip?.videoId);
  const recordVideo = useRecordVideoProgress(clip?.videoId ?? "");
  const recordTimer = useRecordTimer(missionId ?? "", familyId);

  /** 영상이 없으면 처음부터 세기 놀이다 */
  const [how, setHow] = useState<"video" | "count">(hasVideo ? "video" : "count");
  const [watched, setWatched] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const length = clipSeconds(clip);
  const progress = clipProgress(watched, clip);
  const full = isClipDone(watched, clip);
  const range = clipRange(clip);

  /** 세기 놀이를 마쳤을 때. 서버는 1분부터 받는다 */
  const finishGame = async ({ seconds }: { seconds: number }) => {
    setError(null);
    const minutes = Math.floor(seconds / 60);
    if (missionId && minutes >= 1) {
      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - seconds * 1000);
      try {
        await recordTimer.mutateAsync({
          profileId: childProfileId,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          activeMinutes: minutes,
        });
      } catch (e) {
        setError(errorMessage(e, "기록하지 못했어요. 다시 해 볼까요?"));
        return;
      }
    }
    onDone(minutes < 1 ? "1분이 안 돼서 시간 기록은 안 됐어요. 다음엔 조금만 더!" : undefined);
  };

  return (
    <>
      <AppBar back onBack={onBack} title={session.title} />
      <Stage wide className="space-y-5">
        {/* 영상이 있는 세션만 두 가지 방법이 있다 */}
        {hasVideo && (
          <div className="flex gap-2" role="tablist" aria-label="어떻게 할까요">
            {(
              [
                ["video", "영상"],
                ["count", "세기"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={how === value}
                onClick={() => setHow(value)}
                className={cn("chip press flex-1 justify-center", how === value && "chip-on")}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {how === "count" ? (
          <RepGame pending={recordTimer.isPending} onFinish={finishGame} />
        ) : (
          <>
            <YouTubePlayer
              videoId={clip?.videoId ?? ""}
              startSec={clip?.startSec}
              endSec={clip?.endSec}
              onProgress={(_, watchedSec) => {
                setWatched(watchedSec);
                recordVideo.mutate({
                  profileId: childProfileId,
                  progress: clipProgress(watchedSec, clip),
                  watchedSec,
                  missionId,
                });
              }}
            />

            {/* 구간 안에서 어디까지 왔나. 영상 전체가 아니라 이 토막 기준이다 */}
            {length != null && (
              <div>
                <span className="record-rail block">
                  <span
                    className="record-fill"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                    aria-hidden
                  />
                </span>
                <p className="text-faint text-micro mt-1.5 flex justify-between font-bold">
                  <span>{range}</span>
                  <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                </p>
              </div>
            )}

            <div>
              <h2 className="text-xl leading-snug font-extrabold">{session.title}</h2>
              <p className="text-ink-soft mt-1 text-sm">
                {PHASE_LABEL[session.phase]}
                {session.factor && ` · ${session.factor}`}
                {session.minutes != null && ` · ${session.minutes}분`}
              </p>
            </div>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-2xl px-4 py-3 text-sm font-bold"
          >
            {error}
          </p>
        )}

        {how === "video" && (
          <button
            type="button"
            onClick={() => onDone()}
            className={cn(
              "press w-full rounded-2xl py-4 text-lg font-extrabold",
              full ? "bg-signal-strong text-white" : "border-line border-2",
            )}
          >
            {full ? "다 했어요!" : "여기까지 할래요"}
          </button>
        )}
      </Stage>
    </>
  );
}
