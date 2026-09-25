import type { ReactNode } from "react";

import { NavLink } from "./nav-link";
import { cn } from "@/lib/utils";

/** 머리 오른쪽의 아이콘 하나. 44px 누름 자리 */
export function IconLink({
  href,
  label,
  dot,
  children,
  className,
}: {
  href: string;
  label: string;
  /** 새것이 있다는 점 하나. 숫자는 세지 않는다 — 쌓인 숫자는 재촉이 된다 */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <NavLink
      href={href}
      aria-label={dot ? `${label}, 새 소식 있음` : label}
      className={cn(
        "press text-ink relative grid size-11 place-items-center rounded-full",
        className,
      )}
    >
      {children}
      {dot && (
        <span
          aria-hidden
          className="bg-signal ring-ground absolute top-2.5 right-2.5 size-2 rounded-full ring-2"
        />
      )}
    </NavLink>
  );
}
