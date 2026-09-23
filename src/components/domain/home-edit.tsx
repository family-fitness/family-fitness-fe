"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { HOME_CARDS, selectHidden, usePrefsStore } from "@/stores/prefs-store";

/**
 * 홈 편집 — 삼성헬스 「홈 편집」 처럼 부모 홈에서 안 쓰는 카드를 숨긴다.
 *
 * 체력 · 오늘 운동 · 알려 줄 것(다시 재기 · 제안)은 목록에 없다 — 이 앱이 하는 일이라 숨기지 않는다.
 * 고른 것은 이 기기에 남는다(부모 폰 하나를 식구가 같이 쓴다).
 */
export function HomeEdit() {
  const [open, setOpen] = useState(false);
  const hidden = usePrefsStore(selectHidden);
  const toggle = usePrefsStore((s) => s.toggleHomeCard);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press text-ink-soft mx-auto flex min-h-11 items-center px-4 text-sm font-bold"
      >
        홈 편집
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="홈에 보일 카드">
        <ul className="divide-rows pb-2">
          {HOME_CARDS.map((card) => {
            const shown = !hidden.includes(card.id);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  aria-pressed={shown}
                  onClick={() => toggle(card.id)}
                  className="press flex min-h-16 w-full items-center gap-3 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">{card.name}</span>
                    <span className="text-caption text-ink-soft mt-0.5 block">{card.line}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full",
                      shown ? "bg-signal text-white" : "bg-sub",
                    )}
                  >
                    {shown && <Check className="size-4" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-caption text-ink-soft pb-2">
          체력 · 오늘 운동은 늘 보여요. 고른 것은 이 기기에 남아요
        </p>
      </Sheet>
    </>
  );
}
