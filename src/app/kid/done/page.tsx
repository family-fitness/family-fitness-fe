"use client";

import { NavLink } from "@/components/ui/nav-link";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Backdrop } from "@/components/ui/backdrop";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter } from "@/components/domain/kid-character";
import { useVideos } from "@/lib/api/queries";
import { isVideoDone, progressPercent } from "@/lib/mission";
import { useRoleStore } from "@/stores/role-store";
import { cn } from "@/lib/utils";

/**
 * 본 영상.
 *
 * 여기 쌓이는 건 영상뿐이다. "내가 한 운동" 이라고 부르면 세기 놀이만
 * 한 아이가 0 을 보게 된다 — 방금 움직이고 나서 아무것도 안 한 것처럼 보인다.
 * 움직인 날은 홈의 주간 점으로 따로 말해 준다.
 */
export default function DonePage() {
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data, isPending } = useVideos({
    list: "RECENT",
    profileId: childProfileId ?? undefined,
  });

  if (isPending) {
    return (
      <>
        <AppBar backHref="/kid" title="본 영상" />
        <Stage wide className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-3xl" />
          ))}
        </Stage>
      </>
    );
  }

  const watched = data?.videos ?? [];
  const finished = watched.filter((v) => isVideoDone(v.maxProgress));
  const trying = watched.filter((v) => !isVideoDone(v.maxProgress));

  if (watched.length === 0) {
    return (
      <>
        <AppBar backHref="/kid" title="본 영상" />
        <Stage wide className="flex flex-col items-center pt-8 text-center">
          <Illustration name="scene/scene-collection" fallback="scene/scene-no-video" size={150} />
          <p className="mt-4 text-xl font-extrabold">아직 본 영상이 없어요</p>
          <NavLink
            href="/kid/pick"
            className="press bg-signal mt-6 rounded-2xl px-7 py-4 text-lg font-extrabold text-white"
          >
            운동 고르러 가기
          </NavLink>
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar backHref="/kid" title="본 영상" />
      <Stage wide className="relative space-y-6">
        <Backdrop name="bg/bg-gym" />
        <div className="flex items-center gap-3">
          <KidCharacter motion="cheer" size={84} />
          <p className="text-[1.4rem] leading-tight font-extrabold">
            {finished.length}개 완주
            <span className="text-ink-soft block text-sm font-bold">
              {trying.length > 0 ? `하는 중 ${trying.length}개` : "잘하고 있어요"}
            </span>
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3">
          {watched.map((video) => {
            // 반올림한 퍼센트로 다시 재지 않는다. 0.895 는 90% 로 보이지만
            // 서버는 적립하지 않는다 — "완주했는데 기록이 없어요" 가 된다
            const percent = progressPercent(video.maxProgress);
            const done = isVideoDone(video.maxProgress);
            return (
              <li key={video.videoId}>
                <NavLink
                  href={`/kid/play/video-${video.videoId}`}
                  className={cn(
                    "press flex h-full flex-col gap-2 rounded-3xl border-2 p-3",
                    done ? "border-done bg-done-soft" : "border-line",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <Illustration
                      name={done ? "item/item-check-big" : "item/item-target"}
                      fallback="item/item-medal"
                      size={30}
                    />
                    <span
                      className={cn("text-xs font-extrabold", done ? "text-done" : "text-ink-soft")}
                    >
                      {done ? "완주" : `${percent}%`}
                    </span>
                  </span>
                  <span className="line-clamp-3 text-[0.85rem] leading-snug font-bold">
                    {video.title}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </Stage>
    </>
  );
}
