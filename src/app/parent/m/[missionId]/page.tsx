"use client";

import { useParams } from "next/navigation";

import { MissionPlay } from "@/components/domain/mission-play";
import { useSession } from "@/lib/session";

/**
 * 보호자가 자기 몫의 운동을 하는 화면.
 *
 * 「매번 같이」 를 고른 보호자도 운동을 받는데, 하는 화면이 아이 화면 하나뿐이었다. 거기 들어가면 이 기기가
 * 아이 모드로 바뀌었다. 이 화면은 부모 모드 그대로 아이 운동 화면의 부품을 같이 쓰고,
 * 운동하는 사람은 로그인한 보호자 자신이다. 서버는 계정이 붙은 보호자가 자기 칸을 끝내는 것을 받는다.
 */
export default function ParentPlayPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const { profile } = useSession();
  return (
    <MissionPlay
      missionId={missionId}
      actorId={profile?.profileId ?? ""}
      home="/parent/workout"
      forParent
    />
  );
}
