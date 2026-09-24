import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { NavLink } from "@/components/ui/nav-link";

import { PageTransition } from "./stage";

/**
 * 홈의 머리. 큰 제목 하나와 오른쪽 아이콘들.
 *
 * 헬스 앱의 홈 머리를 따른다 — 제목은 크게, 그러나 화면의 1/3 을 차지하지 않게
 * (회의: "헤더만 지금 3분의 1을 차지하고 그러면 안 된다"). 스크롤하면 같이 올라간다.
 * 이 제목이 이 화면의 `<h1>` 이다.
 */
export function HomeHeader({
  eyebrow,
  title,
  titleHref,
  actions,
}: {
  /** 제목 위 작은 줄 — 오늘 날짜 */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** 제목을 누르면 갈 곳 — 부모 홈의 가족 이름은 가족 대시보드로 */
  titleHref?: string;
  actions?: ReactNode;
}) {
  return (
    <PageTransition>
      <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-caption text-ink-soft font-semibold">{eyebrow}</p>}
          <h1 className="page-title mt-0.5 truncate">
            {titleHref ? (
              <NavLink
                href={titleHref}
                className="press inline-flex max-w-full items-center gap-0.5"
              >
                <span className="truncate">{title}</span>
                <ChevronRight
                  aria-hidden
                  className="text-faint size-6 shrink-0"
                  strokeWidth={2.4}
                />
              </NavLink>
            ) : (
              title
            )}
          </h1>
        </div>
        {actions && <div className="-mr-2 flex shrink-0 items-center">{actions}</div>}
      </header>
    </PageTransition>
  );
}
