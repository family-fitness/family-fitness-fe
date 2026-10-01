"use client";

import { useParams } from "next/navigation";

import { MissionPlay } from "@/components/domain/mission-play";
import { useRoleStore } from "@/stores/role-store";

/** 아이의 오늘 운동. 운동하는 사람은 이 기기의 아이다. 화면은 부모 운동 화면과 같이 쓴다(`MissionPlay`) */
export default function PlayPage() {
  const { missionId } = useParams<{ missionId: string }>();
  const kidId = useRoleStore((s) => s.childProfileId) ?? "";
  return <MissionPlay missionId={missionId} actorId={kidId} home="/kid" />;
}
