"use client";

import { Suspense } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { VideoList, VideoListSkeleton } from "@/components/domain/video-list";
import { EMPTY_COPY, VideoTabs, useVideoListKind } from "@/components/domain/video-tabs";

/**
 * 연령대에 맞는 운동 영상.
 * 연령 안전 필터는 서버가 건다 — 라벨 없는 영상은 아이 연령대에 내려오지 않는다.
 */
export default function Page() {
  return (
    <>
      <PageHeader title="운동 영상" back />
      <Screen className="space-y-4">
        {/* useSearchParams 는 Suspense 안에 있어야 한다 */}
        <Suspense fallback={<VideoListSkeleton />}>
          <VideoScreen />
        </Suspense>
      </Screen>
    </>
  );
}

function VideoScreen() {
  const kind = useVideoListKind();
  return (
    <>
      <VideoTabs />
      <VideoList list={kind} empty={{ title: EMPTY_COPY[kind] }} />
    </>
  );
}
