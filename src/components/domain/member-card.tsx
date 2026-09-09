"use client";

import { ChevronRight, Ruler, UserPlus } from "lucide-react";
import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { itemLabel } from "@/lib/fitness-items";
import { formatDate } from "@/lib/utils";
import { GradeBadge } from "@/components/ui/badge";
import { RecordBar } from "./record-bar";

/**
 * 가족 구성원 카드.
 *
 * 상태가 넷으로 갈린다 — 측정 있음 · 측정 없음 · 계정 없는 부모 · 측정 불가.
 * 만 4세 미만은 측정 버튼을 비활성화하는 게 아니라 아예 렌더링하지 않는다.
 */
export function MemberCard({ member, delay = 0 }: { member: FitnessMapMember; delay?: number }) {
  const { profile, headline, overallPercentile, overallGrade, weakestItem, lastMeasuredOn } =
    member;

  return (
    <Link href={`/p/${profile.id}`} className="press card block p-4">
      <div className="flex items-center gap-2">
        <span className="text-[0.95rem] font-extrabold">{profile.displayName}</span>
        <span className="text-faint text-xs font-semibold">
          {profile.age}세 · {profile.role === "PARENT" ? "부모" : "자녀"}
        </span>
        <ChevronRight className="text-faint ml-auto size-4" aria-hidden />
      </div>

      {headline !== null && overallPercentile !== null ? (
        <>
          <div className="mt-3 flex items-end gap-3">
            {/* 기록이 주인공이다. 크게 띄운다 */}
            <span className="board-num text-ink text-[2.6rem]">{overallPercentile}</span>
            <div className="min-w-0 flex-1 pb-1.5">
              <p className="truncate text-sm font-semibold">{headline}</p>
              {weakestItem && (
                <p className="text-faint mt-0.5 text-xs">약한 항목 {itemLabel(weakestItem)}</p>
              )}
            </div>
            {overallGrade && <GradeBadge grade={overallGrade} />}
          </div>

          <RecordBar percentile={overallPercentile} className="mt-3" delay={delay} />

          {lastMeasuredOn && (
            <p className="text-faint mt-2 text-[0.7rem]">{formatDate(lastMeasuredOn)} 측정</p>
          )}
        </>
      ) : (
        <EmptyMemberState member={member} />
      )}
    </Link>
  );
}

function EmptyMemberState({ member }: { member: FitnessMapMember }) {
  const { profile } = member;

  // 만 4세 미만은 국민체력100 규준 자체가 없다. 측정을 권하지 않는다
  if (!profile.measurable) {
    return (
      <p className="text-ink-soft mt-2.5 text-sm">
        만 4세부터 체력 측정 결과를 볼 수 있어요. 지금은 가족 미션에 함께 참여할 수 있어요.
      </p>
    );
  }

  // 계정이 아직 없는 부모. 초대가 먼저다
  if (profile.userId === null && profile.role === "PARENT") {
    return (
      <div className="mt-2.5 space-y-1.5">
        <p className="text-ink-soft text-sm">아직 합류하지 않았어요.</p>
        <span className="text-signal inline-flex items-center gap-1 text-sm font-bold">
          <UserPlus className="size-4" aria-hidden />
          초대코드 보내기
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2.5 space-y-1.5">
      <p className="text-ink-soft text-sm">첫 측정을 등록하면 기록이 그려져요.</p>
      <span className="text-signal inline-flex items-center gap-1 text-sm font-bold">
        <Ruler className="size-4" aria-hidden />
        측정 입력하기
      </span>
    </div>
  );
}
