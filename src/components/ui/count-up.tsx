"use client";

import { useEffect, useRef } from "react";

/** 숫자가 0에서 차올라 멈춘다. */
export function CountUp({
  to,
  duration = 900,
  className,
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = String(to);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // 끝에서 느려진다. 마지막 숫자가 눈에 남는다
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = String(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return (
    <span className={className}>
      <span aria-hidden ref={ref}>
        0
      </span>
      <span className="sr-only">{to}</span>
    </span>
  );
}
