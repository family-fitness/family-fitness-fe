import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { ArtIcon } from "./art-icon";
import { NavLink } from "./nav-link";

/**
 * 카드 안의 한 줄 — 다른 화면으로 가는 길.
 *
 * 줄 앞 그림은 한 결로 새로 주문한 `icon/menu-*` 이다. 예전에는 봉투 · 운동화 · 메달이
 * 한 목록에 섞여 굵기도 색도 다 달랐다. 그림이 오기 전까지는 연한 칸만 비어 있다.
 * 목록은 `card` 안에 `divide-rows` 로 담는다.
 */
export function ListRow({
  href,
  art,
  title,
  description,
  trailing,
}: {
  href: string;
  /** 그림 이름(`icon/menu-family`). 오기 전에는 칸만 비어 있다 */
  art: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <li>
      <NavLink href={href} className="press flex min-h-14 items-center gap-3 py-3">
        {/* 그림을 둥근 면에 넣지 않는다(9/25 「둥근 배경 안에 뭘 넣는 건 너무 AI 같다」) */}
        <ArtIcon name={art} className="size-8 shrink-0" />
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
