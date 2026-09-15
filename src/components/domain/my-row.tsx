"use client";

import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { Avatar } from "@/components/ui/illustration";
import { avatarFor } from "@/lib/avatar";

/**
 * 부모 자신.
 *
 * 기획서의 출발점이 "부모가 움직이지 않으면 아이도 움직이지 않는다" 이고,
 * 첫 기능이 **아빠·엄마·아이를 한 화면에** 놓는 가족 체력 지도다.
 * 아이 점수만 있고 부모가 없으면 이 앱은 잔소리 도구가 된다.
 *
 * 그래도 **아이와 나란히 놓고 비교하지 않는다.** 서버도 구성원 사이 순위를
 * 내보내지 않는다. 각자 자기 또래와 견줄 뿐이다.
 */
export function MyRow({ me }: { me: FitnessMapMember | undefined }) {
  if (!me) return null;

  const score = me.latest?.overallPercentile ?? null;

  return (
    <Link
      href={score == null ? `/p/${me.profileId}/measure` : `/p/${me.profileId}/result`}
      className="press flex items-center gap-3 py-3.5"
    >
      <Avatar parts={avatarFor(me)} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          {score == null ? "내 체력도 재보기" : "내 체력"}
        </span>
        <span className="text-ink-soft mt-0.5 block text-xs">
          {me.headline ?? "아직 안 쟀어요 · 같이 재면 아이가 훨씬 잘 따라와요"}
        </span>
      </span>
      {score != null && (
        <span className="board-num text-signal-deep shrink-0 text-2xl leading-none">{score}</span>
      )}
    </Link>
  );
}
