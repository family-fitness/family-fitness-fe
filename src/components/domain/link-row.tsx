"use client";

import { ChevronRight } from "lucide-react";
import { NavLink } from "@/components/ui/nav-link";
import type { ReactNode } from "react";

import { Illustration } from "@/components/ui/illustration";

/** 다른 화면으로 가는 한 줄. */
export function LinkRow({
  href,
  art,
  title,
  description,
  trailing,
}: {
  href: string;
  /** 에셋 이름. 글만 있으면 어느 줄이 무슨 화면인지 눈에 안 들어온다 */
  art: string;
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <li>
      <NavLink href={href} className="press flex items-center gap-3 py-4">
        <Illustration name={art} size={40} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="text-body block font-bold">{title}</span>
          {description && (
            <span className="text-ink-soft mt-0.5 block text-sm leading-relaxed">
              {description}
            </span>
          )}
        </span>
        {trailing}
        <ChevronRight className="text-faint size-4 shrink-0" aria-hidden />
      </NavLink>
    </li>
  );
}
