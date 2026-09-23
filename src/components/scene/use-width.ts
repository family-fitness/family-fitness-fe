"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * 칸의 실제 폭(CSS 픽셀). 입체 그래프는 폭에 맞춰 높이가 따라 줄고(비율 고정),
 * 그 위 글자 자리도 이 폭으로 셈한다 — 좁은 폰에서 판이 잘리거나 글자가 엇나가지 않게.
 * 재기 전에는 `fallback` 을 쓴다.
 */
export function useWidth(ref: RefObject<HTMLElement | null>, fallback: number) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
