"use client";

import { Check, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Dock } from "@/components/ui/dock";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * 첫 시작 화면의 틀(9/25) — 위에 진행 게이지, 한 화면에 질문 하나, 아래 붙는 단추 하나.
 * 왜 묻는지 · 무엇에 쓰는지 같은 설명 줄은 두지 않는다(9/25 「설명식 문구는 다 지워」).
 *
 * 다른 앱의 첫 로그인처럼 한 번에 한 가지만 묻는다. 게이지가 있어 끝이 보인다 — 끝이 안 보이는 폼은 중간에 닫힌다.
 * 이 화면의 `<h1>` 은 질문이다.
 *
 * 한 칸이 폼 하나다 — 자판의 엔터(다음)로 넘어간다. 자판이 올라오면 아래 단추가 가려져서, 엔터가 없으면
 * 칸마다 자판을 내려야 했다. 칸이 바뀌면 질문 · 입력을 새로 세운다(자동 포커스가 다시 걸리고 한글 조합이 넘어오지 않게).
 */
export function WizardShell({
  step,
  total,
  onBack,
  art,
  title,
  children,
  action,
  onSubmit,
}: {
  /** 0 부터 */
  step: number;
  total: number;
  /** 없으면 뒤로 단추를 두지 않는다(첫 칸 · 되돌릴 수 없는 칸) */
  onBack?: () => void;
  /** 질문 위 그림 — 키움이 */
  art?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** 아래 붙는 단추 — `type="submit"` 으로 준다 */
  action?: ReactNode;
  /** 엔터 · 아래 단추 */
  onSubmit?: () => void;
}) {
  const pct = total > 1 ? Math.round((step / (total - 1)) * 100) : 100;
  return (
    <form
      className="flex min-h-dvh flex-col pb-36"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <div className="flex items-center gap-1 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="뒤로"
            className="press text-ink-soft grid size-11 shrink-0 place-items-center rounded-full"
          >
            <ChevronLeft aria-hidden className="size-6" />
          </button>
        ) : (
          <span aria-hidden className="size-11 shrink-0" />
        )}
        <div
          className="bg-line mr-4 h-2 flex-1 overflow-hidden rounded-full"
          role="progressbar"
          aria-label={`${total}단계 중 ${step + 1}단계`}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step + 1}
        >
          <span
            className="bg-signal block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </div>

      <div key={step} className="flex flex-1 flex-col">
        <div className="px-6 pt-6">
          {art && <div className="mb-4 flex justify-center">{art}</div>}
          <h1 className="page-title leading-snug">{title}</h1>
        </div>

        <div className="mt-7 flex-1 px-6">{children}</div>
      </div>

      {action && <Dock>{action}</Dock>}
    </form>
  );
}

/** 첫 시작 뼈대 — 세션을 기다리거나 이미 가족이 있어 다른 곳으로 보내는 동안 */
export function WizardSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col px-6 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <Skeleton className="ml-10 h-2 w-auto rounded-full" />
      <Skeleton className="mt-10 h-8 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-8 h-14 w-full rounded-2xl" />
    </div>
  );
}

/**
 * 큰 선택 단추 — 제목 · 오른쪽 동그라미. 바탕 위에 흰 면으로 선다. 설명 줄은 두지 않는다.
 * `multi` 면 네모 체크(여럿 고르기), 아니면 동그라미(하나 고르기).
 */
export function ChoiceButton({
  selected,
  onClick,
  title,
  art,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  art?: ReactNode;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "press flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left",
        selected ? "bg-signal-soft ring-signal ring-2 ring-inset" : "bg-paper shadow-card",
      )}
    >
      {art}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-base font-extrabold", selected && "text-signal-deep")}>
          {title}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center border-2",
          multi ? "rounded-md" : "rounded-full",
          selected ? "bg-signal-strong border-signal-strong text-white" : "border-line bg-paper",
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3.5} />}
      </span>
    </button>
  );
}
