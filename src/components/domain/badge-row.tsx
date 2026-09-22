"use client";

import { Illustration } from "@/components/ui/illustration";
import type { Badge } from "@/lib/badges";
import { cn } from "@/lib/utils";

/**
 * 받은 기념 표시.
 *
 * **못 받은 칸은 그리지 않는다.** 자물쇠 걸린 칸을 늘어놓으면 모은 것보다
 * 못 모은 것이 더 커 보인다 — 그건 아이에게 목표가 아니라 빚이 된다.
 * 하나도 없으면 아예 나오지 않는다.
 */
export function BadgeRow({ badges, className }: { badges: Badge[]; className?: string }) {
  if (badges.length === 0) return null;

  return (
    <section className={className}>
      <div className="section-head">
        <h2>내가 받은 것</h2>
      </div>

      {/* 개수를 세지 않는다. 세는 순간 모아야 할 것이 된다(도메인 규칙 12) */}
      <ul className="scroll-row mt-2 flex gap-3 pb-1">
        {badges.map((badge, i) => (
          <li key={badge.id} className="w-[4.5rem] shrink-0 text-center">
            <span
              className="badge-pop border-line bg-paper mx-auto grid size-16 place-items-center rounded-2xl border"
              /* 차례로 하나씩 올라온다. 한꺼번에 뜨면 받은 느낌이 안 난다 */
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <Illustration name={badge.art} fallback={badge.fallback} size={42} />
            </span>
            <span className="mt-1.5 block text-xs leading-snug font-extrabold">{badge.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 한 줄로 좁게. 부모 화면처럼 자리가 없을 때 */
export function BadgeStrip({ badges, className }: { badges: Badge[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {badges.slice(0, 4).map((badge) => (
        <Illustration key={badge.id} name={badge.art} fallback={badge.fallback} size={22} />
      ))}
      {badges.length > 4 && (
        <span className="text-faint text-micro font-bold">+{badges.length - 4}</span>
      )}
    </span>
  );
}
