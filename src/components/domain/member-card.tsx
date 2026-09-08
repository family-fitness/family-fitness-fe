"use client";

import { ChevronRight, Ruler, UserPlus } from "lucide-react";
import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { itemLabel } from "@/lib/fitness-items";
import { formatDate } from "@/lib/utils";
import { Badge, GradeBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * 가족 구성원 카드.
 *
 * 상태가 셋으로 갈린다.
 *   1. 측정 있음 — 한줄요약 · 등급 · 약점
 *   2. 측정 없음 — headline 이 null. 첫 측정을 권한다
 *   3. 측정 불가 — measurable 이 false. 측정 버튼을 렌더링하지 않는다(비활성화가 아니라 없앰)
 */
export function MemberCard({ member }: { member: FitnessMapMember }) {
  const { profile, headline, overallGrade, weakestItem, lastMeasuredOn } = member;
  const measured = headline !== null;

  return (
    <Card className="space-y-3">
      <Link href={`/p/${profile.id}`} className="flex items-center gap-2">
        <span className="font-semibold">{profile.displayName}</span>
        <span className="text-faint text-xs">
          {profile.age}세 · {profile.role === "PARENT" ? "부모" : "자녀"}
        </span>
        <ChevronRight className="text-faint ml-auto size-4" aria-hidden />
      </Link>

      {measured ? (
        <>
          <div className="flex items-center gap-2">
            <p className="text-sm">{headline}</p>
            {overallGrade && <GradeBadge grade={overallGrade} />}
          </div>
          <div className="text-faint flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {weakestItem && <span>약한 항목 {itemLabel(weakestItem)}</span>}
            {lastMeasuredOn && <span>{formatDate(lastMeasuredOn)} 측정</span>}
          </div>
        </>
      ) : (
        <EmptyMemberState member={member} />
      )}
    </Card>
  );
}

function EmptyMemberState({ member }: { member: FitnessMapMember }) {
  const { profile } = member;

  // 만 4세 미만은 국민체력100 규준 자체가 없다. 측정을 권하지 않는다
  if (!profile.measurable) {
    return (
      <p className="text-mute text-sm">
        만 4세부터 체력 측정 결과를 볼 수 있어요. 지금은 가족 미션에 함께 참여할 수 있어요.
      </p>
    );
  }

  // 계정이 아직 없는 부모. 초대가 먼저다
  if (profile.userId === null && profile.role === "PARENT") {
    return (
      <div className="space-y-2">
        <p className="text-mute text-sm">아직 합류하지 않았어요.</p>
        <Link
          href={`/p/${profile.id}`}
          className="text-grow inline-flex items-center gap-1 text-sm font-medium"
        >
          <UserPlus className="size-4" aria-hidden />
          초대코드 보내기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-mute text-sm">첫 측정을 등록하면 지도가 그려져요.</p>
      <Link
        href={`/p/${profile.id}/measure`}
        className="text-grow inline-flex items-center gap-1 text-sm font-medium"
      >
        <Ruler className="size-4" aria-hidden />
        측정 입력하기
      </Link>
    </div>
  );
}

/** 측정을 아직 안 한 사람들을 눈금 아래에 한 줄로 모아 적는다 */
export function UnmeasuredNote({ members }: { members: FitnessMapMember[] }) {
  if (members.length === 0) return null;

  const measurable = members.filter((m) => m.profile.measurable);
  const notYet = members.filter((m) => !m.profile.measurable);

  return (
    <div className="space-y-1 text-xs">
      {measurable.length > 0 && (
        <p className="text-mute">
          아직 재지 않았어요 — {measurable.map((m) => m.profile.displayName).join(" · ")}
        </p>
      )}
      {notYet.length > 0 && (
        <p className="text-faint">
          {notYet.map((m) => m.profile.displayName).join(" · ")}는 만 4세부터 볼 수 있어요
        </p>
      )}
    </div>
  );
}

/** 가족 전체를 한 줄로 요약. 눈금 위에 붙인다 */
export function FamilySummary({ members }: { members: FitnessMapMember[] }) {
  const measured = members.filter((m) => m.overallPercentile !== null);
  if (measured.length === 0) return null;

  const average = Math.round(
    measured.reduce((sum, m) => sum + (m.overallPercentile ?? 0), 0) / measured.length,
  );

  return (
    <div className="flex items-baseline gap-2">
      <Badge tone="grow">가족 평균 상위 {Math.max(1, 100 - average)}%</Badge>
      <span className="text-faint text-xs">{measured.length}명 측정 기준</span>
    </div>
  );
}
