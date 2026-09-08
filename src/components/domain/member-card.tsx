"use client";

import { ChevronRight, Ruler, UserPlus } from "lucide-react";
import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { itemLabel } from "@/lib/fitness-items";
import { formatDate } from "@/lib/utils";
import { GradeBadge } from "@/components/ui/badge";

/**
 * 가족 구성원 카드.
 *
 * 상태가 넷으로 갈린다.
 *   측정 있음 · 측정 없음 · 계정 없는 부모 · 측정 불가(만 4세 미만)
 *
 * 만 4세 미만은 측정 버튼을 비활성화하는 게 아니라 아예 렌더링하지 않는다.
 */
export function MemberCard({ member }: { member: FitnessMapMember }) {
  const { profile, headline, overallPercentile, overallGrade, weakestItem, lastMeasuredOn } =
    member;
  const measured = headline !== null;

  return (
    <Link href={`/p/${profile.id}`} className="press card block p-4">
      <div className="flex items-center gap-2">
        <span className="font-bold">{profile.displayName}</span>
        <span className="text-faint text-xs">
          {profile.age}세 · {profile.role === "PARENT" ? "부모" : "자녀"}
        </span>
        <ChevronRight className="text-faint ml-auto size-4" aria-hidden />
      </div>

      {measured ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            {/* 기록은 전광판에 뜬다 */}
            <span className="board flex flex-col items-center px-2.5 py-1">
              <span className="board-num text-board-lit text-2xl">{overallPercentile}</span>
              <span className="text-board-lit/55 text-[0.52rem] leading-none">/100</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{headline}</p>
              {weakestItem && (
                <p className="text-faint mt-0.5 text-xs">약한 항목 {itemLabel(weakestItem)}</p>
              )}
            </div>
            {overallGrade && <GradeBadge grade={overallGrade} />}
          </div>
          {lastMeasuredOn && (
            <p className="text-faint mt-2 text-[0.68rem]">{formatDate(lastMeasuredOn)} 측정</p>
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
      <p className="text-ink-soft mt-2 text-sm">
        만 4세부터 체력 측정 결과를 볼 수 있어요. 지금은 가족 미션에 함께 참여할 수 있어요.
      </p>
    );
  }

  // 계정이 아직 없는 부모. 초대가 먼저다
  if (profile.userId === null && profile.role === "PARENT") {
    return (
      <div className="mt-2 space-y-1.5">
        <p className="text-ink-soft text-sm">아직 합류하지 않았어요.</p>
        <span className="text-track-deep inline-flex items-center gap-1 text-sm font-bold">
          <UserPlus className="size-4" aria-hidden />
          초대코드 보내기
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-ink-soft text-sm">첫 측정을 등록하면 트랙에 올라가요.</p>
      <span className="text-track-deep inline-flex items-center gap-1 text-sm font-bold">
        <Ruler className="size-4" aria-hidden />
        측정 입력하기
      </span>
    </div>
  );
}
