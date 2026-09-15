"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Illustration } from "@/components/ui/illustration";

/**
 * 다른 화면으로 가는 한 줄.
 *
 * 허브 화면을 카드 격자로 만들지 않는다. 같은 크기 카드가 늘어선 화면은
 * 무엇이 중요한지 말하지 않고, AI 가 만든 화면의 가장 흔한 신호다.
 * 선으로 나눈 목록이 훑기도 빠르다.
 */
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
      <Link href={href} className="press flex items-center gap-3 py-4">
        <Illustration name={art} size={40} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.95rem] font-bold">{title}</span>
          {description && (
            <span className="text-ink-soft mt-0.5 block text-sm leading-relaxed">
              {description}
            </span>
          )}
        </span>
        {trailing}
        <ChevronRight className="text-faint size-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
