import type { KeyboardEvent } from "react";

const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/**
 * 하나 고르기 묶음(`role="radiogroup"`)의 화살표 — 옆 칸으로 옮기며 고른다(WAI-ARIA 라디오 묶음).
 * 묶음에 `onKeyDown={radioKeys}` 로 단다. 끝에서는 처음으로 돈다
 */
export function radioKeys(e: KeyboardEvent<HTMLElement>) {
  const by = STEP[e.key];
  if (!by) return;
  const radios = [
    ...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'),
  ];
  const at = radios.findIndex((r) => r === document.activeElement);
  if (at < 0) return;
  e.preventDefault();
  const next = radios[(at + by + radios.length) % radios.length];
  next.focus();
  next.click();
}
