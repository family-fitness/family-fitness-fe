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
  manageHref,
  className,
}: {
  members: FitnessMapMember[];
  /** 가족 관리로 가는 길. 없으면 링크를 그리지 않는다 */
  manageHref?: string;
  className?: string;
}) {
  const measured = members.filter((m) => m.latest?.overallPercentile != null);
  if (members.length === 0) return null;

  return (
    <section className={className}>
      <div className="section-head">
        <h2>우리 가족</h2>
        {manageHref && (
          <Link
            href={manageHref}
            className="text-signal-strong -mr-3 inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-xs font-bold"
          >
            관리
          </Link>
        )}
      </div>

      {/*
        축 하나에 모두 올린다. 사람마다 따로 그리면 견줄 수가 없다.
        한 명만 쟀으면 축을 그리지 않는다 — 점 하나짜리 축은 말해 주는 게 없다.

        아바타는 **축 위쪽에만** 둔다. 위아래로 번갈아 놓으면 아래쪽 것이
        눈금 글자를 덮는다. 자리가 가까우면 높이만 조금 어긋나게 한다.
      */}
      {measured.length > 1 && (
        <div className="relative mt-4 h-32">
          {/*
            굵은 띠를 깔았더니 아무것도 안 찬 진행 막대처럼 보였다. 여기서 재는
            건 진행률이 아니라 **자리**다 — 가는 축 하나와 가운데 눈금으로 둔다.
          */}
          <span className="bg-line absolute inset-x-0 bottom-7 h-px" />
          <span
            className="border-line absolute top-0 bottom-7 left-1/2 w-px -translate-x-1/2 border-l border-dashed"
            aria-hidden
          />
          <span className="bg-ink-soft absolute bottom-6 left-1/2 h-2 w-px -translate-x-1/2" />
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
                    /* 축이 28px 자리다. 그 위에 올라선다. 자리가 가까운 사람끼리
                       겹치지 않게 높이만 번갈아 어긋나게 둔다 */
                    bottom: i % 2 === 0 ? 32 : 52,
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
