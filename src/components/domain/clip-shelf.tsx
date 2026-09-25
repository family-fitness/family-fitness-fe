"use client";

import Link from "next/link";

import { CardHead } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoThumb } from "@/components/ui/video-thumb";
import { useClips } from "@/lib/api/queries";
import type { Factor } from "@/lib/fitness-factors";
import { clock } from "@/lib/session-plan";

/**
 * 해 볼 운동이 가로로 흐르는 한 줄 — 삼성헬스 홈의 「새로운 컨텐츠」 처럼(9/25).
 *
 * 국민체력100 운동영상의 본운동 클립이다. 아이의 키울 힘(서버가 준 weakest)이 있으면 그 힘,
 * 없으면 모든 힘. 누르면 운동 찾기에서 그 클립의 시범이 바로 열린다. 옛 「키우고 싶은 힘으로 찾기」
 * 요인 칸 여섯을 대신한다 — 칸만 있고 볼 것이 없었다.
 */
export function ClipShelf({ factor }: { factor: Factor | null }) {
  const { data, isPending, error } = useClips({ factor, phase: "MAIN" });
  // 못 받으면 이 줄은 접는다 — 볼 거리일 뿐 할 일이 아니다. 운동 찾기로 가는 길은 위 묶음에 있다
  if (error) return null;
  const clips = (data?.clips ?? []).slice(0, 8);
  if (!isPending && clips.length === 0) return null;

  const title = factor ? `${factor} 키우는 운동` : "해 볼 만한 운동";
  // 운동 찾기도 같은 줄(본운동 · 이 힘)로 연다 — 거르지 않고 열면 첫 40개 밖의 클립은 시범이 안 열렸다
  const more = `/videos?phase=MAIN${factor ? `&factor=${encodeURIComponent(factor)}` : ""}`;
  const open = (clipId: string) => `${more}&clip=${encodeURIComponent(clipId)}`;

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
                    href={open(c.clipId)}
                    className="press block"
                    aria-label={`${c.title} 시범 보기`}
                  >
                    <span className="relative block overflow-hidden rounded-2xl">
                      <VideoThumb videoId={c.videoId} className="aspect-video w-full" />
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-sm leading-snug font-bold">
                      {c.title}
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
