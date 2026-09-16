"use client";

import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { Avatar } from "@/components/ui/illustration";
import { avatarFor } from "@/lib/avatar";

/** 부모 자신. */
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
