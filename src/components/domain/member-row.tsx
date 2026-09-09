"use client";

import { ChevronRight, Ruler, UserPlus } from "lucide-react";
import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { avatarFor } from "@/lib/avatar";
import { itemLabel } from "@/lib/fitness-items";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/illustration";
import { GradeBadge } from "@/components/ui/badge";
import { RecordBar } from "./record-bar";

/**
 * 구성원 한 줄.
 *
 * 카드로 감싸지 않는다. 흰 배경 위에 흰 카드를 얹으면 테두리만 늘고,
 * 균일한 라운드 카드를 나열하는 건 AI 가 만든 화면에서 가장 자주 보이는 모양이다.
 * 줄 사이는 선으로만 나눈다.
 *
 * 상태가 넷으로 갈린다 — 측정 있음 · 측정 없음 · 계정 없는 부모 · 측정 불가.
 */
export function MemberRow({ member, delay = 0 }: { member: FitnessMapMember; delay?: number }) {
  const { profile, headline, overallPercentile, overallGrade, weakestItem, lastMeasuredOn } =
    member;
  const measured = headline !== null && overallPercentile !== null;

  return (
    <Link href={`/p/${profile.id}`} className="press block py-4">
      <div className="flex items-center gap-3">
        <Avatar parts={avatarFor(profile)} size={48} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[0.95rem] font-extrabold">{profile.displayName}</span>
            <span className="text-faint text-xs font-semibold">
              {profile.age}세 · {profile.role === "PARENT" ? "부모" : "자녀"}
            </span>
          </div>
          {measured ? (
            <p className="text-ink-soft mt-0.5 truncate text-sm">{headline}</p>
          ) : (
            <EmptyLine member={member} />
          )}
        </div>

        {measured ? (
          <div className="flex items-center gap-2">
            <span className="board-num text-ink text-[2.1rem] leading-none">
              {overallPercentile}
            </span>
            {overallGrade && <GradeBadge grade={overallGrade} />}
          </div>
        ) : (
          <ChevronRight className="text-faint size-4" aria-hidden />
        )}
      </div>

      {measured && (
        <div className="mt-3 space-y-1.5 pl-[3.75rem]">
          <RecordBar percentile={overallPercentile} delay={delay} />
          <div className="text-faint flex items-center gap-2 text-[0.7rem]">
            {weakestItem && <span>약한 항목 {itemLabel(weakestItem)}</span>}
            {lastMeasuredOn && <span>· {formatDate(lastMeasuredOn)} 측정</span>}
          </div>
        </div>
      )}
    </Link>
  );
}

function EmptyLine({ member }: { member: FitnessMapMember }) {
  const { profile } = member;

  // 만 4세 미만은 국민체력100 규준 자체가 없다. 측정을 권하지 않는다
  if (!profile.measurable) {
    return <p className="text-faint mt-0.5 text-sm">만 4세부터 측정할 수 있어요</p>;
  }

  if (profile.userId === null && profile.role === "PARENT") {
    return (
      <span className="text-signal mt-0.5 inline-flex items-center gap-1 text-sm font-bold">
        <UserPlus className="size-3.5" aria-hidden />
        초대코드 보내기
      </span>
    );
  }

  return (
    <span className="text-signal mt-0.5 inline-flex items-center gap-1 text-sm font-bold">
      <Ruler className="size-3.5" aria-hidden />첫 측정 입력하기
    </span>
  );
}
