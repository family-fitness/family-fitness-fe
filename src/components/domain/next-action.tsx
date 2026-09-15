"use client";

import { ChevronRight, ClipboardCheck, Play, Ruler, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import type { CoachRun, FitnessMapMember, Mission } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 지금 할 일 한 줄.
 *
 * 홈이 현황판으로만 끝나면 사람이 "그래서 뭘 하지" 에서 멈춘다.
 * 상태를 훑어 가장 급한 것 하나만 고른다. 여러 개를 나열하면 다시 현황판이 된다.
 *
 * 우선순위
 *   1. 승인을 기다리는 제안 — 여기서 막히면 미션이 아예 안 생긴다
 *   2. 오늘 할 미션
 *   3. 첫 측정
 *   4. 아무것도 없으면 코치를 돌려 보라고 권한다
 */
export function NextAction({
  coachRun,
  missions,
  members,
  canApprove,
}: {
  coachRun: CoachRun | undefined;
  missions: Mission[] | undefined;
  members: FitnessMapMember[];
  canApprove: boolean;
}) {
  const action = pick(coachRun, missions, members, canApprove);
  if (!action) return null;

  return (
    <Link
      href={action.href}
      className={cn(
        "press rounded-card flex items-center gap-3 px-4 py-4",
        action.urgent ? "bg-signal text-white" : "bg-ink text-paper",
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

function pick(
  coachRun: CoachRun | undefined,
  missions: Mission[] | undefined,
  members: FitnessMapMember[],
  canApprove: boolean,
): Action | null {
  // 승인 전에는 미션이 0건이다. 여기가 가장 급하다
  if (coachRun?.status === "AWAITING_APPROVAL") {
    const count = coachRun.proposals?.length ?? 0;
    return {
      href: "/coach/weekly",
      label: canApprove
        ? `이번 주 제안 ${count}건이 승인을 기다려요`
        : `이번 주 제안 ${count}건이 도착했어요`,
      icon: ClipboardCheck,
      urgent: true,
    };
  }

  const pending = missions?.find((m) => m.participants?.some((p) => !p.completed));
  if (pending) {
    return {
      href: `/missions/${pending.missionId}`,
      label: `${pending.title} 하러 가기`,
      icon: Play,
    };
  }

  const unmeasured = members.find((m) => m.measurable && !m.latest);
  if (unmeasured) {
    return {
      href: `/p/${unmeasured.profileId}/measure`,
      label: `${unmeasured.name}의 첫 측정을 등록해 보세요`,
      icon: Ruler,
    };
  }

  return { href: "/coach/weekly", label: "이번 주 운동을 짜 볼까요", icon: Sparkles };
}
