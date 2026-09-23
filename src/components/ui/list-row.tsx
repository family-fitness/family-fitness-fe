import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ArtIcon } from "./art-icon";
import { NavLink } from "./nav-link";

/**
 * 카드 안의 한 줄 — 다른 화면으로 가는 길.
 *
 * 줄 앞 그림은 한 결로 새로 주문한 `icon/menu-*` 이다. 예전에는 봉투 · 운동화 · 메달이
 * 한 목록에 섞여 굵기도 색도 다 달랐다. 그림이 오기 전까지는 선 아이콘이 대신 선다.
 * 목록은 `card` 안에 `divide-rows` 로 담는다.
 */
export function ListRow({
  href,
  art,
  icon,
  title,
  description,
  trailing,
}: {
  href: string;
  /** 그림 이름(`icon/menu-family`). 그림이 오기 전까지 `icon` 이 대신 선다 */
  art: string;
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
          <ArtIcon name={art} fallback={icon} className="size-5.5" />
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
