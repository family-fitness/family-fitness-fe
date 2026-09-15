"use client";

import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { Illustration } from "@/components/ui/illustration";
import { withJosa } from "@/lib/utils";

/** 며칠이 지나면 다시 재자고 말할지. 아이 키는 한 계절이면 달라진다 */
const STALE_DAYS = 90;

export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00`).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/**
 * 다시 재자고 말하는 자리.
 *
 * 아이 키와 몸무게는 한 계절이면 달라진다. 지난 기록으로 계속 비교하면 점수가 틀어진다.
 *
 * **막지 않는다.** 그냥 말만 한다 — 측정을 강제하면 그날로 앱을 닫는다.
 * "오래됐어요" 라고 쓰지 않는다. 부모를 탓하는 말이다.
 */
export function UpdateNudge({ child }: { child: FitnessMapMember }) {
  const days = daysSince(child.latest?.testedOn);
  if (days == null || days < STALE_DAYS) return null;

  const months = Math.floor(days / 30);

  return (
    <Link
      href={`/parent/update/${child.profileId}`}
      className="press border-mark bg-mark-soft flex items-center gap-3 rounded-2xl border p-4"
    >
      <Illustration name="scene/scene-need-update" fallback="item/item-tape" size={52} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">
          {withJosa(child.name ?? "아이", "이가")} 그동안 자랐어요
        </span>
        <span className="text-ink-soft mt-0.5 block text-xs leading-relaxed">
          마지막으로 잰 지 {months}개월 됐어요. 키·몸무게를 다시 재면 점수가 더 정확해져요.
        </span>
      </span>
    </Link>
  );
}
