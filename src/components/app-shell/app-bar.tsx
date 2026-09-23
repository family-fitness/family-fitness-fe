"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 화면 맨 위 한 줄. */
export function AppBar({
  back,
  backHref,
  onBack,
  title,
  right,
  className,
}: {
  back?: boolean;
  /** 돌아갈 곳. 주면 뒤로 가는 움직임도 방향이 맞는다 */
  backHref?: string;
  /**
   * 화면 안에서 한 단계 되돌릴 때. 라우트가 안 바뀌는 자리에 쓴다 —
   * 세션을 하다 목록으로 돌아가는 것처럼.
   */
  onBack?: () => void;
  title?: string;
  right?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const showBack = back || Boolean(backHref) || Boolean(onBack);

  const backButton = backHref ? (
    <Link
      href={backHref}
      transitionTypes={["nav-back"]}
      aria-label="뒤로"
      className="press text-ink-soft grid size-10 shrink-0 place-items-center rounded-full"
    >
      <ChevronLeft className="size-6" />
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => (onBack ? onBack() : router.back())}
      aria-label="뒤로"
      className="press text-ink-soft grid size-10 shrink-0 place-items-center rounded-full"
    >
      <ChevronLeft className="size-6" />
    </button>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-1 px-2",
        "bg-ground/90 backdrop-blur-sm",
        className,
      )}
      style={{ viewTransitionName: "app-bar" }}
    >
      {showBack ? backButton : <span className="w-2" />}

      {/* 이 막대의 제목이 곧 이 화면의 제목이다. 제목을 안 주는 화면은
          본문에 자기 제목을 크게 두고 있으므로 여기서 빈 제목을 만들지 않는다 */}
      {title ? (
        <h1 className="text-body min-w-0 flex-1 truncate px-1 font-bold">{title}</h1>
      ) : (
        <span className="min-w-0 flex-1" />
      )}

      {right}
    </header>
  );
}
