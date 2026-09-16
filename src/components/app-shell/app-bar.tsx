"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 화면 맨 위 한 줄.
 *
 * 탭바를 없앴으므로 **여기가 유일한 길잡이**다. 그래서 가볍게 만든다 —
 * 뒤로, 지금 어디인지, 오른쪽에 하나. 그 이상 넣지 않는다.
 *
 * 화면이 미끄러질 때 이 막대는 제자리에 머문다(`viewTransitionName`).
 * 머리까지 같이 가면 붙잡을 기준점이 사라진다.
 *
 * **`backHref` 를 주면 뒤로 가는 것도 방향이 생긴다.** `router.back()` 은
 * 전환 종류를 실을 수 없어서(React 19.2 정식판에 `addTransitionType` 이 없다)
 * 화면이 툭 바뀐다. 돌아갈 곳이 분명한 화면은 주소를 적어 준다.
 */
export function AppBar({
  back,
  backHref,
  title,
  right,
  className,
}: {
  back?: boolean;
  /** 돌아갈 곳. 주면 뒤로 가는 움직임도 방향이 맞는다 */
  backHref?: string;
  title?: string;
  right?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const showBack = back || Boolean(backHref);

  const backButton = backHref ? (
    <Link
      href={backHref}
      transitionTypes={["nav-back"]}
      aria-label="뒤로"
      className="press text-ink-soft hover:text-ink grid size-10 shrink-0 place-items-center rounded-full"
    >
      <ChevronLeft className="size-6" />
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="뒤로"
      className="press text-ink-soft hover:text-ink grid size-10 shrink-0 place-items-center rounded-full"
    >
      <ChevronLeft className="size-6" />
    </button>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-1 px-2",
        "bg-paper/90 backdrop-blur-sm",
        className,
      )}
      style={{ viewTransitionName: "app-bar" }}
    >
      {showBack ? backButton : <span className="w-2" />}

      <span className="min-w-0 flex-1 truncate px-1 text-[0.95rem] font-bold">{title}</span>

      {right}
    </header>
  );
}
