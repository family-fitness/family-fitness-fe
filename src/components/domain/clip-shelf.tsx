"use client";

import Link from "next/link";

import { CardHead } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { useClips } from "@/lib/api/queries";
import type { Factor } from "@/lib/fitness-factors";
import { clock } from "@/lib/session-plan";
import { clipHref, exerciseLine, finderHref } from "@/lib/videos";

/**
 * 해 볼 운동이 가로로 흐르는 한 줄 — 삼성헬스 홈의 「새로운 컨텐츠」 처럼(9/25).
 *
 * 국민체력100 운동영상의 본운동 클립이다. 보고 있는 아이의 연령대 목록에서, 아이의 키울 힘(서버가 준
 * weakest)이 있으면 그 힘, 없으면 모든 힘. profileId 를 빼면 서버가 로그인한 부모의 연령대(성인)로 걸러
 * 아이 줄에 어른 영상이 떴다. 누르면 그 동작의 운동 상세가 열린다. 옛 「키우고 싶은 힘으로 찾기」
 * 요인 칸 여섯을 대신한다 — 칸만 있고 볼 것이 없었다.
 */
export function ClipShelf({
  factor,
  profileId,
}: {
  factor: Factor | null;
  /** 보고 있는 아이. 운동 찾기에도 실어 보낸다 — 같은 목록이라야 누른 클립의 시범이 열린다 */
  profileId: string | undefined;
}) {
  const { data, isPending, error } = useClips({ factor, phase: "MAIN", profileId });
  // 못 받으면 이 줄은 접는다 — 볼 거리일 뿐 할 일이 아니다. 운동 찾기로 가는 길은 위 묶음에 있다
  if (error) return null;
  const clips = (data?.clips ?? []).slice(0, 8);
  if (!isPending && clips.length === 0) return null;

  const title = factor ? `${factor} 키우는 운동` : "해 볼 만한 운동";
  // 운동 찾기도 같은 줄(본운동 · 이 힘 · 이 아이)로 연다 — 거르지 않고 열면 첫 40개 밖의 클립은 시범이 안 열렸다
  const more = finderHref({ factor, profileId });

  return (
    <section aria-label={title} className="pt-2">
      <CardHead title={title} meta="국민체력100 운동영상" href={more} className="mx-0 px-1" />
      <div className="scroll-row -mx-4 mt-2 px-4 pb-1">
        <ul className="flex gap-3">
          {isPending
            ? [0, 1, 2].map((i) => (
                <li key={i} className="w-40 shrink-0">
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <Skeleton className="mt-2 h-4 w-32" />
                </li>
              ))
            : clips.map((c) => (
                <li key={c.clipId} className="w-40 shrink-0">
                  <Link
                    // 누르면 운동 상세(영상과 설명)로
                    href={clipHref(c)}
                    className="press block"
                    aria-label={`${c.title} 운동 정보 보기`}
                  >
                    <span className="relative block overflow-hidden rounded-2xl">
                      <VideoThumb
                        videoId={c.videoId}
                        src={c.thumbnailUrl}
                        className="aspect-video w-full"
                      />
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-sm leading-snug font-bold">
                      {c.title}
                    </span>
                    <span className="text-caption text-ink-soft block truncate">
                      {exerciseLine(c)}
                    </span>
                    {/* 길이는 썸네일 위 검은 딱지가 아니라 이름 아래 글자로 */}
                    <span className="text-caption text-ink-soft block tabular-nums">
                      {clock(c.endSec - c.startSec)}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}
