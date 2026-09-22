"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * 영상 목록 종류.
 *
 * 전에는 `/videos` · `/videos/favorites` · `/videos/recent` 세 라우트가 있었고,
 * 셋 다 같은 컴포넌트를 부르는 스무 줄짜리 껍데기였다. 고른 탭은 **URL 로
 * 표현되는 것**이라 주소에 남아야 하지만(AGENTS.md 「상태를 어디에 둘지」),
 * 그건 searchParams 하나면 된다 — 라우트를 셋으로 나눌 일이 아니다.
 */
export type VideoListKind = "ALL" | "FAVORITES" | "RECENT";

const TABS: [VideoListKind, string][] = [
  ["ALL", "전체"],
  ["FAVORITES", "즐겨찾기"],
  ["RECENT", "본 영상"],
];

/** 주소에서 지금 어느 탭인지 읽는다. 모르는 값이면 전체다 */
export function useVideoListKind(): VideoListKind {
  const value = useSearchParams().get("list")?.toUpperCase();
  return TABS.some(([kind]) => kind === value) ? (value as VideoListKind) : "ALL";
}

export function VideoTabs() {
  const current = useVideoListKind();
  return (
    <nav className="flex gap-2" aria-label="영상 목록 종류">
      {TABS.map(([kind, label]) => (
        <Link
          key={kind}
          href={kind === "ALL" ? "/videos" : `/videos?list=${kind.toLowerCase()}`}
          replace
          scroll={false}
          aria-current={current === kind ? "page" : undefined}
          className={cn("chip press min-w-20", current === kind && "chip-on")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** 탭마다 다른 빈 화면 문구 */
export const EMPTY_COPY: Record<VideoListKind, string> = {
  ALL: "아직 볼 수 있는 영상이 없어요",
  FAVORITES: "즐겨찾기한 영상이 없어요",
  RECENT: "아직 본 영상이 없어요",
};
