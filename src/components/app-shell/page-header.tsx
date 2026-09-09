"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 화면 머리.
 *
 *   FAMILY            ← 영문 eyebrow
 *   하준이네           ← 큰 제목
 *   ─────────────     ← 굵은 선
 *
 * 제목을 크게 쓰는 이유는 이 앱이 읽는 앱이 아니라 보는 앱이라서다.
 * 매 화면이 같은 머리 모양을 가지면 어디에 있는지 헷갈리지 않는다.
 */
export function PageHeader({
  eyebrow,
  title,
  meta,
  back,
  action,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="px-4 pt-3 pb-3">
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로"
          className="press text-ink-soft hover:text-ink -mt-1 mb-1 -ml-2 block p-2"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="page-title mt-0.5 truncate">{title}</h1>
        </div>
        {action}
      </div>

      <div className="rule mt-2.5" />

      {meta && (
        <div className="text-ink-soft mt-2 flex items-center justify-between gap-3 text-xs font-semibold">
          {meta}
        </div>
      )}
    </header>
  );
}
