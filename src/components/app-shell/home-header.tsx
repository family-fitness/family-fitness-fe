import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { NavLink } from "@/components/ui/nav-link";

import { PageTransition } from "./stage";

/**
 * 홈의 머리. 큰 제목 하나와 오른쪽 아이콘들.
 *
 * 헬스 앱의 홈 머리를 따른다 — 제목은 크게, 그러나 화면의 1/3 을 차지하지 않게
 * (회의: "헤더만 지금 3분의 1을 차지하고 그러면 안 된다"). 화면을 내려도 위에 붙어 따라온다
 * (10/1 「헤더도 화면 내리면 좀 따라오게」). 아래 탭(z-30)과 시트(z-50)보다는 아래에 둔다.
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
      {/* 제목이 자리를 다 쓰면 아이콘들이 다음 줄로 — 큰 글씨(125%)에서 「서준 / 이네」 처럼 이름이 가운데서 꺾였다 */}
      <header className="bg-ground border-line sticky top-0 z-20 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-b px-5 pt-4 pb-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-caption text-ink-soft font-semibold">{eyebrow}</p>}
          {/* 긴 가족 이름은 두 줄까지 — 한 줄로 자르면 오른쪽 아이콘들에 밀려 「무지…」 만 남았다 */}
          <h1 className="page-title mt-0.5">
            {titleHref ? (
              <NavLink
                href={titleHref}
                className="press inline-flex min-h-11 max-w-full items-center gap-0.5"
              >
                <span className="line-clamp-2">{title}</span>
                <ChevronRight
                  aria-hidden
                  className="text-faint size-6 shrink-0"
                  strokeWidth={2.4}
                />
              </NavLink>
            ) : (
              <span className="line-clamp-2">{title}</span>
            )}
          </h1>
        </div>
        {actions && <div className="-mr-2 ml-auto flex shrink-0 items-center">{actions}</div>}
      </header>
    </PageTransition>
  );
}
