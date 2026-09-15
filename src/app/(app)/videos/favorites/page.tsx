"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { VideoList } from "@/components/domain/video-list";
import { VideoTabs } from "@/components/domain/video-tabs";

/** 즐겨찾기한 영상. */
export default function Page() {
  return (
    <>
      <PageHeader eyebrow="VIDEO" title="운동 영상" back />
      <Screen className="space-y-4">
        <VideoTabs />
        <VideoList
          list="FAVORITES"
          empty={{
            title: "즐겨찾기한 영상이 없어요",
            description: "마음에 드는 영상에 하트를 누르면 여기 모여요.",
          }}
        />
      </Screen>
    </>
  );
}
