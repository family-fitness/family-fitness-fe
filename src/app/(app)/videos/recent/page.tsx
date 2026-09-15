"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { VideoList } from "@/components/domain/video-list";
import { VideoTabs } from "@/components/domain/video-tabs";

/** 보던 영상. 어디까지 봤는지가 남는다. */
export default function Page() {
  return (
    <>
      <PageHeader title="운동 영상" back />
      <Screen className="space-y-4">
        <VideoTabs />
        <VideoList
          list="RECENT"
          empty={{
            title: "아직 본 영상이 없어요",
            description: "영상을 재생하면 어디까지 봤는지 여기 남아요.",
          }}
        />
      </Screen>
    </>
  );
}
