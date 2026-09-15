"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 맨 위 한 줄.
 *
 * 탭바를 없앴으므로 **여기가 유일한 길잡이**다. 그래서 가볍게 만든다 —
 * 뒤로, 지금 어디인지, 오른쪽에 하나. 그 이상 넣지 않는다.
 *
 * 제목을 큰 글씨로 따로 두지 않는다. 화면 본문의 첫 줄이 제목 노릇을 한다.
 * 머리와 본문이 같은 말을 두 번 하면 폰 화면에서 자리만 먹는다.
 */
export function AppBar({
  back,
  title,
  right,
  className,
}: {
  back?: boolean;
  title?: string;
  right?: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-1 px-2",
        "bg-paper/90 backdrop-blur-sm",
        className,
      )}
    >
      {back ? (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="press text-ink-soft hover:text-ink grid size-10 shrink-0 place-items-center rounded-full"
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : (
        <span className="w-2" />
      )}

      <span className="min-w-0 flex-1 truncate px-1 text-[0.95rem] font-bold">{title}</span>

      {right}
    </header>
  );
}
