"use client";

import { ChevronRight, ClipboardCheck, Ruler, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import type { CoachRun, FitnessMapMember, Mission } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 지금 할 일 한 줄.
 *
 * 홈이 현황판으로만 끝나면 사람이 "그래서 뭘 하지"에서 멈춘다.
 * 상태를 훑어서 가장 급한 것 하나만 고른다. 여러 개를 나열하면 다시 현황판이 된다.
 *
 * 우선순위
 *   1. 승인을 기다리는 코치 제안 — 여기서 막히면 미션이 아예 안 생긴다
 *   2. 오늘 할 미션
 *   3. 첫 측정
 */
export function NextAction({
  coachRun,
  missions,
  members,
}: {
  coachRun: CoachRun | null | undefined;
  missions: Mission[] | undefined;
  members: FitnessMapMember[];
}) {
  const action = pickAction(coachRun, missions, members);
  if (!action) return null;

  return (
    <Link
      href={action.href}
      className={cn(
        "press rounded-card flex items-center gap-3 px-4 py-3.5",
        action.urgent ? "bg-track text-white" : "bg-field text-white",
      )}
    >
      <action.icon className="size-5 shrink-0" aria-hidden />
      <span className="flex-1 text-sm font-bold">{action.label}</span>
      <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}

interface Action {
  href: string;
  label: string;
  icon: LucideIcon;
  urgent?: boolean;
}

function pickAction(
  coachRun: CoachRun | null | undefined,
  missions: Mission[] | undefined,
  members: FitnessMapMember[],
): Action | null {
  if (coachRun?.status === "AWAITING_APPROVAL") {
    return {
      href: "/coach/weekly",
      label: `이번 주 제안 ${coachRun.proposalItems.length}건이 승인을 기다려요`,
      icon: ClipboardCheck,
      urgent: true,
    };
  }

  const pending = missions?.find((m) => m.participants.some((p) => p.status !== "DONE"));
  if (pending) {
    return { href: `/missions/${pending.id}`, label: `${pending.title} 하러 가기`, icon: Play };
  }

  const unmeasured = members.find(
    (m) => m.profile.measurable && m.headline === null && m.profile.userId !== null,
  );
  const anyUnmeasured =
    unmeasured ?? members.find((m) => m.profile.measurable && m.headline === null);
  if (anyUnmeasured) {
    return {
      href: `/p/${anyUnmeasured.profile.id}/measure`,
      label: `${anyUnmeasured.profile.displayName}의 첫 측정을 등록해 보세요`,
      icon: Ruler,
    };
  }

  return null;
}
