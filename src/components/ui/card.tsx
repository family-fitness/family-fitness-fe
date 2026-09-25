import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { NavLink } from "./nav-link";
import { cn } from "@/lib/utils";

/**
 * 헬스 앱의 기본 단위. 회색 바탕 위에 흰 면을 얹는다.
 *
 * `hero` 는 화면의 주인공 하나에만 준다. 모든 카드가 같은 크기 · 같은 무게면
 * 그게 AI 가 만든 화면의 대표 신호다 — 큰 것 하나, 작은 것 여럿.
 *
 * `href` 를 주면 **카드 전체가 링크**다. 안에 누르는 것(버튼)이 있는 카드는
 * 링크 안에 버튼을 넣을 수 없으니 `href` 대신 머리(`CardHead`)에 `href` 를 준다.
 */
export function Card({
  hero,
  href,
  label,
  className,
  children,
}: {
  hero?: boolean;
  href?: string;
  /** 카드 전체가 링크일 때 읽어 줄 이름. 안의 글이 길면 이걸로 짧게 */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const shape = cn(hero ? "card-hero" : "card", className);
  if (href) {
    return (
      <NavLink href={href} aria-label={label} className={cn(shape, "card-tap")}>
        {children}
      </NavLink>
    );
  }
  return <section className={shape}>{children}</section>;
}

/**
 * 카드 머리 — 왼쪽 제목, 오른쪽 곁말(날짜 · 개수).
 * `href` 가 있으면 머리 줄이 링크가 되고 끝에 › 가 붙는다. 누를 수 없는 머리에는 › 를 달지 않는다.
 */
export function CardHead({
  title,
  meta,
  href,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      <h2 className="text-body min-w-0 truncate font-extrabold tracking-tight">{title}</h2>
      <span className="text-caption text-ink-soft flex shrink-0 items-center gap-0.5 font-semibold">
        {meta}
        {href && <ChevronRight aria-hidden className="text-faint -mr-1 size-4" />}
      </span>
    </>
  );

  if (href) {
    return (
      <NavLink
        href={href}
        className={cn(
          "press -mx-2 -my-1.5 flex min-h-11 items-center justify-between gap-2 rounded-xl px-2",
          className,
        )}
      >
        {inner}
      </NavLink>
    );
  }
  return (
    <div className={cn("flex min-h-8 items-center justify-between gap-2", className)}>{inner}</div>
  );
}
