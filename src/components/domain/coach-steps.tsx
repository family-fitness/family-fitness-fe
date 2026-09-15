"use client";

import { Check, Loader2, X } from "lucide-react";

import type { CoachStep } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 코치가 거쳐 간 단계.
 *
 * 돌아가는 동안 스피너 하나만 두면 "AI 가 뭔가 하고 있다" 로 끝난다.
 * 실제로는 네 단계다 — 측정 확인 · 자료 검색 · 편성 · 검증. 그걸 그대로 보여준다.
 * 검색 단계가 무엇을 찾았는지 적혀 있어야 제안이 어디서 나왔는지 설명된다.
 */
const STEP_LABEL: Record<string, string> = {
  assess: "가족 측정 기록 확인",
  retrieve: "또래 운동처방 · 영상 검색",
  compose: "이번 주 편성",
  verify: "연령 필터 · 근거 확인",
};

export function CoachSteps({ steps }: { steps: CoachStep[] | null | undefined }) {
  if (!steps || steps.length === 0) return null;

  return (
    <ol className="divide-rows">
      {[...steps]
        .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        .map((step) => {
          const done = step.status === "ok";
          const failed = step.status === "failed" || step.status === "refused";
          return (
            <li key={step.seq} className="flex items-start gap-3 py-3">
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                  done && "bg-signal text-white",
                  failed && "border-line text-ink-soft border",
                  !done && !failed && "border-line border",
                )}
                aria-hidden
              >
                {done ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : failed ? (
                  <X className="size-3" strokeWidth={3} />
                ) : (
                  <Loader2 className="text-faint size-3 animate-spin" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">
                  {STEP_LABEL[step.name ?? ""] ?? step.name}
                </span>
                {step.summary && (
                  <span className="text-ink-soft block text-xs leading-relaxed">
                    {step.summary}
                  </span>
                )}
              </span>
            </li>
          );
        })}
    </ol>
  );
}
