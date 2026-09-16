"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Backdrop } from "@/components/ui/backdrop";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { KidCharacter } from "@/components/domain/kid-character";
import { MissionTimer } from "@/components/domain/mission-timer";
import { DiceGame } from "@/components/domain/dice-game";
import { RepGame } from "@/components/domain/rep-game";
import { YouTubePlayer } from "@/components/domain/youtube-player";
import { DoneCard } from "@/components/domain/done-card";
import { ApiError } from "@/lib/api/client";
import { useMissions, useRecordTimer, useRecordVideoProgress, useVideos } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { targetCopy } from "@/lib/mission";
import { cn } from "@/lib/utils";

/** 운동하기. */
export default function PlayPage() {
  const router = useRouter();
  const { playId } = useParams<{ playId: string }>();
  const { familyId } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);

  const videoOnly = playId.startsWith("video-");
  const videoId = videoOnly ? playId.slice("video-".length) : null;

  const { data: missions, isPending: missionPending } = useMissions(familyId, { scope: "ALL" });
  const { data: videos, isPending: videoPending } = useVideos({ list: "ALL" });

  const mission = videoOnly ? undefined : missions?.missions?.find((m) => m.missionId === playId);
  const suggested = videoOnly ? videos?.videos?.find((v) => v.videoId === videoId) : undefined;
  /*
    미션 영상과 목록 영상은 모양이 다르다 — 미션 쪽에만 시작 지점(startSec)이 있다.
    화면이 쓰는 세 가지만 뽑아 한 모양으로 맞춘다.
  */
  const video = videoOnly
    ? { videoId: suggested?.videoId, title: suggested?.title, startSec: null as number | null }
    : {
        videoId: mission?.video?.videoId,
        title: mission?.video?.title,
        startSec: mission?.video?.startSec ?? null,
      };

  const recordVideo = useRecordVideoProgress(video?.videoId ?? "");
  const recordTimer = useRecordTimer(mission?.missionId ?? "", familyId ?? "");

  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 같은 운동을 두 가지 방법으로 할 수 있다. */
  const [how, setHow] = useState<"video" | "count" | "dice">("video");

  if (missionPending || videoPending) return <PlaySkeleton />;

  if (!mission && !video) {
    return (
      <>
        <AppBar back title="운동하기" />
        <Stage wide>
          <EmptyState
            scene="no-video"
            title="운동을 찾지 못했어요"
            description="앞 화면으로 돌아가서 다시 골라 주세요."
          />
        </Stage>
      </>
    );
  }

  const title = mission?.title ?? video?.title ?? "오늘의 운동";
  const isTimer = mission?.targetMetric === "TIMER_MINUTES";

  /** 놀이를 마쳤을 때. */
  const finishGame = async ({ seconds }: { seconds: number }) => {
    setError(null);
    const minutes = Math.floor(seconds / 60);
    if (mission?.missionId && minutes >= 1) {
      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - seconds * 1000);
      try {
        await recordTimer.mutateAsync({
          profileId: childProfileId ?? "",
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          activeMinutes: minutes,
        });
      } catch (e) {
        setError(e instanceof ApiError ? e.userMessage : "기록하지 못했어요. 다시 해 볼까요?");
      }
    }
    setDone(true);
  };

  if (done) {
    return (
      <>
        <AppBar back title="다 했어요" />
        <Stage wide className="relative">
          <Backdrop name="bg/bg-confetti" height={220} />
          <DoneCard
            familyId={familyId ?? ""}
            childProfileId={childProfileId ?? ""}
            missionId={mission?.missionId}
            title={title}
            onHome={() => router.replace("/kid")}
          />
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar back title={title} />
      <Stage wide className="relative space-y-5">
        <Backdrop name={how === "video" ? "bg/bg-living-room" : "bg/bg-playground"} height={180} />
        <div className="flex gap-2" role="tablist" aria-label="어떻게 할까요">
          {(
            [
              ["video", "영상"],
              ["count", "세기"],
              ["dice", "주사위"],
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

        {how === "count" ? (
          <RepGame pending={recordTimer.isPending} onFinish={finishGame} />
        ) : how === "dice" ? (
          <DiceGame pending={recordTimer.isPending} onFinish={finishGame} />
        ) : video?.videoId ? (
          <YouTubePlayer
            videoId={video.videoId}
            startSec={video.startSec}
            onProgress={(progress, watchedSec) => {
              recordVideo.mutate({
                profileId: childProfileId ?? "",
                progress,
                watchedSec,
                missionId: mission?.missionId,
              });
            }}
          />
        ) : (
          <div className="bg-sub grid place-items-center rounded-2xl py-10">
            <KidCharacter motion="squat" size={140} />
          </div>
        )}

        {/* 놀이 중에는 제목을 다시 쓰지 않는다. 위 막대에 이미 있고, 화면이 좁다 */}
        <div className={cn(how !== "video" && "hidden")}>
          <h2 className="text-xl leading-snug font-extrabold">{title}</h2>
          {mission && (
            <p className="text-ink-soft mt-1 text-sm">
              {targetCopy(mission.targetMetric, mission.targetValue)}
            </p>
          )}
          {mission?.rationale && (
            <p className="text-ink-soft mt-2 text-sm leading-relaxed">{mission.rationale}</p>
          )}
        </div>

        {/* 타이머 미션이면 여기서 시간을 잰다. 서버가 진짜로 아는 값이다 */}
        {how === "video" && isTimer && mission?.missionId && (
          <MissionTimer
            missionId={mission.missionId}
            pending={recordTimer.isPending}
            onFinish={async (body) => {
              setError(null);
              try {
                await recordTimer.mutateAsync({ profileId: childProfileId ?? "", ...body });
              } catch (e) {
                setError(
                  e instanceof ApiError ? e.userMessage : "기록하지 못했어요. 다시 해 볼까요?",
                );
              }
            }}
          />
        )}

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-2xl px-4 py-3 text-sm font-bold"
          >
            {error}
          </p>
        )}

        {/* 아이가 누르는 마지막 버튼. 여기까지 오면 오늘 할 일은 끝이다 */}
        {how === "video" && (
          <>
            <button
              type="button"
              onClick={() => setDone(true)}
              className="press bg-signal w-full rounded-2xl py-5 text-xl font-extrabold text-white"
            >
              다 했어요!
            </button>

            <p className="text-faint text-center text-xs leading-relaxed">
              영상을 끝까지 보면 자동으로 기록돼요. 중간에 그만둬도 괜찮아요.
            </p>
          </>
        )}
      </Stage>
    </>
  );
}

function PlaySkeleton() {
  return (
    <>
      <AppBar back title="운동하기" />
      <Stage wide className="space-y-5">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </Stage>
    </>
  );
}
