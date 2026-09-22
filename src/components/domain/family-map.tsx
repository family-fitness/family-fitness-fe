"use client";

import Link from "next/link";

import { Avatar } from "@/components/ui/illustration";
import type { FitnessMapMember } from "@/lib/api/types";
import { avatarFor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * 가족 체력 지도.
 *
 * 기획서의 첫 번째 기능이다. 아이 한 명만 보여주면 이 앱은 부모가 아이를
 * 관리하는 도구가 된다 — **가족이 같은 축 위에 함께 서 있어야** 같이 하자는
 * 말이 된다. 아직 안 잰 사람도 줄에 남겨 둔다. 빠뜨리면 없는 사람이 된다.
 *
 * 축은 또래 백분위다. 나이대가 달라도 각자의 또래와 견준 값이라 나란히 둘 수 있다 —
 * 아빠와 아이를 직접 비교하는 게 아니다.
 */
export function FamilyMap({
  members,
  className,
}: {
  members: FitnessMapMember[];
  className?: string;
}) {
  const measured = members.filter((m) => m.latest?.overallPercentile != null);
  if (members.length === 0) return null;

  return (
    <section className={className}>
      <div className="section-head">
        <h2>우리 가족</h2>
        <span className="text-faint text-micro font-bold">각자의 또래와 견준 자리</span>
      </div>

      {/*
        축 하나에 모두 올린다. 사람마다 따로 그리면 견줄 수가 없다.
        한 명만 쟀으면 축을 그리지 않는다 — 점 하나짜리 축은 말해 주는 게 없다.

        아바타는 **축 위쪽에만** 둔다. 위아래로 번갈아 놓으면 아래쪽 것이
        눈금 글자를 덮는다. 자리가 가까우면 높이만 조금 어긋나게 한다.
      */}
      {measured.length > 1 && (
        <div className="relative mt-4 h-32">
          {/* 막대는 아래쪽에 깔고 그 위에 사람을 세운다 */}
          <span className="bg-sub absolute inset-x-0 bottom-7 h-2 rounded-full" />
          <span className="bg-line absolute bottom-5 left-1/2 h-6 w-px -translate-x-1/2" />
          <span className="text-faint text-micro absolute bottom-0 left-1/2 -translate-x-1/2 font-bold">
            또래 평균
          </span>

          {measured
            .slice()
            .sort((a, b) => (a.latest?.overallPercentile ?? 0) - (b.latest?.overallPercentile ?? 0))
            .map((member, i) => {
              const score = member.latest?.overallPercentile ?? 0;
              return (
                <Link
                  key={member.profileId}
                  href={`/parent/child/${member.profileId}`}
                  aria-label={`${member.name} 또래 100명 중 ${score}번째`}
                  /* 그림은 34px 지만 누르는 자리는 44px 이어야 한다 */
                  className="press absolute grid size-11 -translate-x-1/2 place-items-center"
                  style={{
                    left: `${Math.min(92, Math.max(8, score))}%`,
                    /* 막대가 28~36px 를 차지한다. 그 위에 올라서게 둔다 */
                    bottom: i % 2 === 0 ? 34 : 52,
                  }}
                >
                  <span className="border-paper bg-paper block rounded-full border-2">
                    <Avatar parts={avatarFor(member)} size={34} />
                  </span>
                </Link>
              );
            })}
        </div>
      )}

      <ul className="divide-rows mt-1">
        {members.map((member) => {
          const score = member.latest?.overallPercentile;
          return (
            <li key={member.profileId}>
              <Link
                href={`/parent/child/${member.profileId}`}
                className="press flex items-center gap-2.5 py-2.5"
              >
                <Avatar parts={avatarFor(member)} size={30} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-bold">{member.name}</span>
                  <span className="text-faint text-caption ml-1.5">{member.ageGroup}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-right",
                    score == null && "text-faint text-caption font-bold",
                  )}
                >
                  {score == null ? (
                    "아직 안 쟀어요"
                  ) : (
                    <span className="board-num text-signal-deep text-lg leading-none">{score}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
