"use client";

import { NavLink } from "@/components/ui/nav-link";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Backdrop } from "@/components/ui/backdrop";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter, type Motion } from "@/components/domain/kid-character";
import { useFamilyProfiles, useVideos } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { cn } from "@/lib/utils";

/** 오늘 할 운동 고르기. */

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
  const profile = family?.profiles?.find((p) => p.profileId === childProfileId);

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
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
          ))}
        </Stage>
      </>
    );
  }

  const videos = data?.videos ?? [];

  return (
    <>
      <AppBar backHref="/kid" title="운동 고르기" />
      <Stage wide className="relative space-y-4">
        <Backdrop name="bg/bg-park" height={190} />
        <h1 className="text-[1.5rem] leading-tight font-extrabold">뭐 하고 싶어?</h1>

        {videos.length === 0 ? (
          <EmptyState
            scene="no-video"
            title="아직 고를 운동이 없어요"
            description="나이에 맞는 영상을 준비하고 있어요."
          />
        ) : (
          <ul className="space-y-3">
            {videos.map((video, index) => {
              const done = (video.maxProgress ?? 0) >= 0.9;
              return (
                <li key={video.videoId}>
                  <NavLink
                    href={`/kid/play/video-${video.videoId}`}
                    className={cn(
                      "press flex items-center gap-3 rounded-3xl border-2 p-4",
                      done ? "border-done bg-done-soft" : "border-line",
                    )}
                  >
                    <KidCharacter
                      motion={motionFor(video.label?.factors, index)}
                      size={84}
                      cycle={1400}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[1.05rem] leading-snug font-extrabold">
                        {video.title}
                      </span>
                      {video.badges && video.badges.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {video.badges.map((b) => (
                            <span
                              key={b}
                              className="bg-sub text-ink-soft rounded px-1.5 py-0.5 text-[0.65rem] font-bold"
                            >
                              {b}
                            </span>
                          ))}
                        </span>
                      )}
                      {done && (
                        <span className="text-done mt-1.5 block text-xs font-extrabold">
                          완주했어요
                        </span>
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
