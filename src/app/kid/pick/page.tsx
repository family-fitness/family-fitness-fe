"use client";

import { useState } from "react";

import { NavLink } from "@/components/ui/nav-link";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Backdrop } from "@/components/ui/backdrop";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter, type Motion } from "@/components/domain/kid-character";
import { useFamilyProfiles, useFitnessMap, useVideos } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { isVideoDone, progressPercent } from "@/lib/mission";
import { labelBadges, labelFactors } from "@/lib/video-label";
import { useRoleStore } from "@/stores/role-store";
import { cn } from "@/lib/utils";

/**
 * 오늘 할 운동 고르기.
 *
 * 전에는 서버가 준 순서대로 늘어놓기만 했다. 이제 **라벨로 거른다** —
 * 어느 요인을 키우고 싶은지 고르면 그 영상만 남는다.
 */

/** 영상이 어떤 요인을 다루는지에 따라 캐릭터 동작을 고른다 */
function motionFor(factors: string[] | undefined, index: number): Motion {
  const f = factors?.[0] ?? "";
  if (f.includes("유연")) return "stretch";
  if (f.includes("심폐")) return "run";
  if (f.includes("근력") || f.includes("근지구")) return "squat";
  if (f.includes("순발") || f.includes("민첩")) return "jump";
  // 라벨이 없으면 카드마다 다른 동작을 줘서 줄줄이 같아 보이지 않게 한다
  return (["jump", "run", "squat", "stretch"] as const)[index % 4];
}

export default function PickPage() {
  const { familyId } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: family } = useFamilyProfiles(familyId);
  const { data: map } = useFitnessMap(familyId);
  const profile = family?.profiles?.find((p) => p.profileId === childProfileId);
  const weakest = map?.members?.find((m) => m.profileId === childProfileId)?.latest?.weakest
    ?.factor;

  const [factor, setFactor] = useState<string | null>(null);

  const { data, isPending } = useVideos({
    list: "ALL",
    profileId: childProfileId ?? undefined,
    ageGroup: profile?.ageGroup,
  });

  if (isPending) {
    return (
      <>
        <AppBar backHref="/kid" title="운동 고르기" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))}
        </Stage>
      </>
    );
  }

  const all = data?.videos ?? [];
  /*
    실제로 있는 요인만 칩으로 낸다. 눌러도 아무것도 안 나오는 칩을 두지 않는다.
    지금 키우면 좋을 요인을 맨 앞에 둔다 — 아이에게 "약점" 이라고 말하지 않고
    순서로만 권한다.
  */
  const factors = [...new Set(all.flatMap((v) => labelFactors(v.label)))].sort((a, b) =>
    a === weakest ? -1 : b === weakest ? 1 : 0,
  );
  const videos = factor ? all.filter((v) => labelFactors(v.label).includes(factor)) : all;

  return (
    <>
      <AppBar backHref="/kid" title="운동 고르기" />
      <Stage wide className="relative space-y-4">
        <Backdrop name="bg/bg-park" height={190} />
        <h2 className="text-[1.5rem] leading-tight font-extrabold">뭐 하고 싶어?</h2>

        {factors.length > 1 && (
          <div className="scroll-row">
            <div className="flex w-max gap-2">
              <button
                type="button"
                aria-pressed={factor === null}
                onClick={() => setFactor(null)}
                className={cn("chip press", factor === null && "chip-on")}
              >
                전체
              </button>
              {factors.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={factor === f}
                  onClick={() => setFactor(f)}
                  className={cn("chip press", factor === f && "chip-on")}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {videos.length === 0 ? (
          <EmptyState
            scene="no-video"
            title={factor ? `${factor} 운동이 아직 없어요` : "아직 고를 운동이 없어요"}
          />
        ) : (
          <ul className="space-y-3">
            {videos.map((video, index) => {
              const done = isVideoDone(video.maxProgress);
              const watched = progressPercent(video.maxProgress);
              const badges = labelBadges(video);
              return (
                <li key={video.videoId}>
                  <NavLink
                    href={`/kid/play/video-${video.videoId}`}
                    className={cn(
                      "press flex items-center gap-3 rounded-3xl border-2 p-4",
                      done ? "border-done bg-done-soft" : "border-line",
                    )}
                  >
                    <KidCharacter motion={motionFor(labelFactors(video.label), index)} size={84} />
                    <span className="min-w-0 flex-1">
                      <span className="text-lead line-clamp-2 leading-snug font-extrabold">
                        {video.title}
                      </span>

                      {badges.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {badges.map((b) => (
                            <span
                              key={b}
                              className="bg-sub text-ink-soft text-micro rounded px-1.5 py-0.5 font-bold"
                            >
                              {b}
                            </span>
                          ))}
                        </span>
                      )}

                      {done ? (
                        <span className="text-done mt-1.5 block text-xs font-extrabold">
                          완주했어요
                        </span>
                      ) : (
                        watched > 0 && (
                          <span className="mt-2 block">
                            <span className="bg-sub block h-1.5 overflow-hidden rounded-full">
                              <span
                                className="bg-mark block h-full rounded-full"
                                style={{ width: `${watched}%` }}
                              />
                            </span>
                            <span className="text-faint text-micro mt-1 block font-bold">
                              {watched}%까지 봤어요
                            </span>
                          </span>
                        )
                      )}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </Stage>
    </>
  );
}
