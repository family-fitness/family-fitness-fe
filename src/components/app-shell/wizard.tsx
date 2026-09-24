"use client";

import { Check, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Dock } from "@/components/ui/dock";
import { cn } from "@/lib/utils";

/**
 * 첫 시작 화면의 틀(9/25) — 위에 진행 게이지, 한 화면에 질문 하나, 까닭 한 줄, 아래 붙는 단추 하나.
 *
 * 다른 앱의 첫 로그인처럼 한 번에 한 가지만 묻는다. 게이지가 있어 끝이 보인다 — 끝이 안 보이는 폼은 중간에 닫힌다.
 * 이 화면의 `<h1>` 은 질문이다.
 */
export function WizardShell({
  step,
  total,
  onBack,
  art,
  title,
  reason,
  children,
  action,
}: {
  /** 0 부터 */
  step: number;
  total: number;
  /** 없으면 뒤로 단추를 두지 않는다(첫 칸 · 되돌릴 수 없는 칸) */
  onBack?: () => void;
  /** 질문 위 그림 — 키움이 */
  art?: ReactNode;
  title: ReactNode;
  /** 왜 묻는지 한 줄 */
  reason?: ReactNode;
  children?: ReactNode;
  /** 아래 붙는 단추 */
  action?: ReactNode;
}) {
  const pct = total > 1 ? Math.round((step / (total - 1)) * 100) : 100;
  return (
    <div className="flex min-h-dvh flex-col pb-36">
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

      <div className="px-6 pt-6">
        {art && <div className="mb-4 flex justify-center">{art}</div>}
        <h1 className="page-title leading-snug">{title}</h1>
        {reason && <p className="text-ink-soft text-body mt-2 leading-relaxed">{reason}</p>}
      </div>

      <div className="mt-7 flex-1 px-6">{children}</div>

      {action && <Dock>{action}</Dock>}
    </div>
  );
}

/**
 * 큰 선택 단추 — 제목 · 한 줄 설명 · 오른쪽 동그라미. 바탕 위에 흰 면으로 선다.
 * `multi` 면 네모 체크(여럿 고르기), 아니면 동그라미(하나 고르기).
 */
export function ChoiceButton({
  selected,
  onClick,
  title,
  note,
  art,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  note?: ReactNode;
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
        {note && <span className="text-caption text-ink-soft mt-0.5 block">{note}</span>}
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
