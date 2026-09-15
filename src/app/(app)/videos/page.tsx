"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { VideoList } from "@/components/domain/video-list";
import { VideoTabs } from "@/components/domain/video-tabs";

/** 연령대에 맞는 운동 영상. 연령 안전 필터는 서버가 건다 — 라벨 없는 영상은 아이 연령대에 내려오지 않는다. */
export default function Page() {
  return (
    <>
      <PageHeader eyebrow="VIDEO" title="운동 영상" back />
      <Screen className="space-y-4">
        <VideoTabs />
        <VideoList
          list="ALL"
          empty={{
            title: "아직 볼 수 있는 영상이 없어요",
            description: "연령대에 맞는 영상을 준비하고 있어요.",
          }}
        />
      </Screen>
    </>
  );
}
