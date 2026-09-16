"use client";

import { ChevronRight, Ruler, UserPlus } from "lucide-react";
import Link from "next/link";

import type { FitnessMapMember } from "@/lib/api/types";
import { avatarFor } from "@/lib/avatar";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/illustration";

/** 구성원 한 줄. */
export function MemberRow({ member }: { member: FitnessMapMember }) {
  const { profileId, name, role, ageGroup, headline, latest, measurable, hasAccount } = member;

  return (
    <Link href={`/p/${profileId}`} className="press flex items-center gap-3 py-4">
      <Avatar parts={avatarFor(member)} size={48} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[0.95rem] font-extrabold">{name}</span>
          <span className="text-faint text-xs font-semibold">
            {ageGroup} · {role === "PARENT" ? "부모" : "자녀"}
          </span>
        </div>

        {headline ? (
          <>
            {/* 서버가 만든 문장을 그대로 쓴다. 우리가 다시 조립하지 않는다 */}
            <p className="text-ink-soft mt-0.5 truncate text-sm">{headline}</p>
            {latest?.testedOn && (
              <p className="text-faint mt-0.5 text-[0.7rem]">{formatDate(latest.testedOn)} 측정</p>
            )}
          </>
        ) : (
          <EmptyLine measurable={measurable} hasAccount={hasAccount} role={role} />
        )}
      </div>

      <ChevronRight className="text-faint size-4 shrink-0" aria-hidden />
    </Link>
  );
}

function EmptyLine({
  measurable,
  hasAccount,
  role,
}: {
  measurable?: boolean;
  hasAccount?: boolean;
  role?: "PARENT" | "CHILD";
}) {
  // 만 4세 미만은 국민체력100 규준 자체가 없다. 측정을 권하지 않는다
  if (measurable === false) {
    return <p className="text-faint mt-0.5 text-sm">만 4세부터 측정할 수 있어요</p>;
  }

  if (hasAccount === false && role === "PARENT") {
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
