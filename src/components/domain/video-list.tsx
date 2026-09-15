"use client";

import { Heart, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Video } from "@/lib/api/types";
import { useToggleFavorite, useVideos } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * 영상 목록.
 *
 * **연령 안전 필터는 서버가 건다.** 라벨이 없는 영상은 아이 연령대 요청에
 * 아예 내려오지 않는다. 프론트에서 거르면 한 군데만 빠뜨려도 새어 나간다.
 *
 * 뱃지(조용함 · 좁은 공간 OK · 준비물 없음)도 서버가 만든다. 아파트에서 저녁에
 * 할 수 있는지가 실제로 볼지 말지를 가르는 정보라 제목만큼 크게 보여준다.
 */
export function VideoList({
  list,
  empty,
}: {
  list: "ALL" | "FAVORITES" | "RECENT";
  empty: { title: string; description: string };
}) {
  const { profile } = useSession();

  const { data, isPending } = useVideos({
    list,
    profileId: profile?.profileId,
    // 아이 프로필로 보고 있으면 그 연령대로 제한해서 받는다
    ageGroup: profile?.ageGroup,
  });

  if (isPending) return <VideoListSkeleton />;

  const videos = data?.videos ?? [];
  if (videos.length === 0) {
    return <EmptyState scene="no-video" title={empty.title} description={empty.description} />;
  }

  return (
    <ul className="divide-rows">
      {videos.map((video) => (
        <VideoRow key={video.videoId} video={video} />
      ))}
    </ul>
  );
}

function VideoRow({ video }: { video: Video }) {
  const { profile } = useSession();
  const toggle = useToggleFavorite(profile?.profileId ?? "");

  const watched = Math.round((video.maxProgress ?? 0) * 100);
  const done = (video.maxProgress ?? 0) >= 0.9;

  return (
    <li className="py-3.5">
      <div className="flex gap-3">
        <Link
          href={video.url ?? "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="press relative block w-30 shrink-0 overflow-hidden rounded-xl"
        >
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt=""
              width={160}
              height={90}
              className="aspect-video w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="bg-sub grid aspect-video w-full place-items-center">
              <Play className="text-faint size-5" aria-hidden />
            </span>
          )}
          {video.durationSec != null && (
            <span className="bg-signal-deep/85 absolute right-1 bottom-1 rounded px-1 py-0.5 text-[0.6rem] font-bold text-white tabular-nums">
              {formatDuration(video.durationSec)}
            </span>
          )}
          {/* 어디까지 봤는지. 다시 켤지 말지를 여기서 정한다 */}
          {watched > 0 && (
            <span className="bg-signal-deep/25 absolute inset-x-0 bottom-0 h-1" aria-hidden>
              <span
                className={cn("block h-full", done ? "bg-done" : "bg-mark")}
                style={{ width: `${watched}%` }}
              />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={video.url ?? "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[0.88rem] leading-snug font-bold"
          >
            {video.title}
          </Link>

          {video.badges && video.badges.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {video.badges.map((b) => (
                <li
                  key={b}
                  className="bg-sub text-ink-soft rounded px-1.5 py-0.5 text-[0.65rem] font-bold"
                >
                  {b}
                </li>
              ))}
            </ul>
          )}

          <p className="text-faint mt-1 text-[0.68rem]">
            {done ? "완주했어요" : watched > 0 ? `${watched}%까지 봤어요` : ageRange(video)}
          </p>
        </div>

        <button
          type="button"
          aria-label={video.favorited ? "즐겨찾기 빼기" : "즐겨찾기 넣기"}
          aria-pressed={video.favorited}
          onClick={() =>
            toggle.mutate({ videoId: video.videoId ?? "", favorited: !video.favorited })
          }
          className="press grid size-9 shrink-0 place-items-center self-start rounded-lg"
        >
          <Heart
            className={cn("size-4.5", video.favorited ? "fill-signal text-signal" : "text-faint")}
            aria-hidden
          />
        </button>
      </div>
    </li>
  );
}

function ageRange(video: Video) {
  const { ageFrom, ageTo } = video.label ?? {};
  if (ageFrom == null && ageTo == null) return "";
  return `만 ${ageFrom ?? "?"}~${ageTo ?? "?"}세`;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function VideoListSkeleton() {
  return (
    <ul className="divide-rows">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex gap-3 py-3.5">
          <Skeleton className="aspect-video w-30 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}
