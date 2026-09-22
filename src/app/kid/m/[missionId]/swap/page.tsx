"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles, useMissions, useVideos } from "@/lib/api/queries";
import type { MissionWithSessions } from "@/lib/api/types";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { clipSeconds, nextSession, sessionsOf } from "@/lib/session-plan";
import {
  SWAP_REASONS,
  SWAP_WHY,
  labelBadges,
  pickAlternatives,
  videoArt,
  type SwapReason,
} from "@/lib/video-label";
import { cn } from "@/lib/utils";

/**
 * 다른 운동 받기.
 *
 * **목록을 보여 주지 않는다. 이유를 먼저 받는다.**
 *
 * 지금 앱의 「다른 운동 고르기」는 추천이 아니라 나열이었다 — 연령대에 맞는
 * 영상을 쭉 보여 줄 뿐이라 왜 이게 떴는지 아이도 부모도 알 수 없었다.
 * 이유를 알면 그 이유에 맞는 것만 골라 올 수 있고, **방향은 그대로 둔다** —
 * 키우려던 요인을 바꾸면 그건 다른 운동이 아니라 다른 계획이다.
 */
export default function SwapPage() {
  const router = useRouter();
  const { missionId } = useParams<{ missionId: string }>();
  const { familyId } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);

  const { data: family } = useFamilyProfiles(familyId);
  const profile = family?.profiles?.find((p) => p.profileId === childProfileId);
  const { data: missions } = useMissions(familyId, { scope: "ALL" });
  const { data: videos, isPending } = useVideos({ list: "ALL", ageGroup: profile?.ageGroup });
  const { data: watched } = useVideos({ list: "RECENT", profileId: childProfileId ?? undefined });

  const [reason, setReason] = useState<SwapReason | null>(null);

  const mission = missions?.missions?.find((m) => m.missionId === missionId) as
    MissionWithSessions | undefined;
  const current = nextSession(sessionsOf(mission));

  if (isPending) {
    return (
      <>
        <AppBar back title="다른 운동" />
        <Stage wide className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </Stage>
      </>
    );
  }

  const alternatives = reason
    ? pickAlternatives(videos?.videos ?? [], {
        reason,
        factor: current?.factor,
        currentVideoId: current?.clip?.videoId,
        currentSeconds: clipSeconds(current?.clip),
        watched: watched?.videos,
      })
    : [];

  return (
    <>
      <AppBar back title="다른 운동" />
      <Stage wide className="space-y-5">
        <h2 className="text-[1.4rem] leading-snug font-extrabold">왜 바꾸고 싶어요?</h2>

        <div className="flex flex-wrap gap-2">
          {SWAP_REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={reason === r.key}
              onClick={() => setReason(r.key)}
              className={cn("chip press", reason === r.key && "chip-on")}
            >
              {r.label}
            </button>
          ))}
        </div>

        {reason && (
          <>
            <div className="section-head">
              <h2>그럼 이건 어때요?</h2>
            </div>

            {alternatives.length === 0 ? (
              <EmptyState scene="no-video" title="바꿀 만한 게 아직 없어요" />
            ) : (
              <ul className="space-y-3">
                {alternatives.map((video) => (
                  <li key={video.videoId}>
                    <button
                      type="button"
                      onClick={() => router.replace(`/kid/m/video-${video.videoId}`)}
                      className="press border-line flex w-full items-center gap-3 rounded-3xl border-2 p-4 text-left"
                    >
                      <span className="bg-signal-soft grid size-14 shrink-0 place-items-center rounded-xl">
                        <Illustration name={videoArt(video)} fallback="item/item-shoes" size={30} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-lead line-clamp-2 leading-snug font-extrabold">
                          {video.title}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {labelBadges(video).map((b) => (
                            <span
                              key={b}
                              className="bg-sub text-ink-soft text-micro rounded px-1.5 py-0.5 font-bold"
                            >
                              {b}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* 왜 이걸 골랐는지. 나열이 아니라 고름이라는 게 여기서 보인다 */}
            <p className="bg-signal-soft text-signal-deep rounded-2xl px-4 py-3 text-sm leading-relaxed font-bold">
              {SWAP_WHY[reason]}
              {current?.factor && ` · ${current.factor}은 그대로예요`}
            </p>
          </>
        )}
      </Stage>
    </>
  );
}
