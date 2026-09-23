import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { NavLink } from "./nav-link";

/**
 * 카드 안의 한 줄 — 다른 화면으로 가는 길.
 *
 * 줄마다 그림을 따로 뽑아 붙이던 것을 선 아이콘으로 바꿨다. 봉투 · 운동화 · 메달이
 * 한 목록에 섞이니 굵기도 색도 다 달라서 "중구난방" 의 한 원인이었다.
 * 목록은 `card` 안에 `divide-rows` 로 담는다.
 */
export function ListRow({
  href,
  icon: Icon,
  title,
  description,
  trailing,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <li>
      <NavLink href={href} className="press flex min-h-14 items-center gap-3 py-3">
        <span
          aria-hidden
          className="bg-signal-soft text-signal-strong grid size-9 shrink-0 place-items-center rounded-xl"
        >
          <Icon className="size-4.5" strokeWidth={2.1} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          {description && (
            <span className="text-caption text-ink-soft mt-0.5 block">{description}</span>
          )}
        </span>
        {trailing}
        <ChevronRight className="text-faint size-4 shrink-0" aria-hidden />
      </NavLink>
    </li>
  );
}
