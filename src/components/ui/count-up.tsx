"use client";

import { useEffect, useRef } from "react";

/**
 * 숫자가 0에서 차올라 멈춘다.
 *
 * 링은 차오르는데 숫자만 툭 나타나면 둘이 따로 논다. 같이 올라가야
 * "재 보니 이만큼" 이라는 한 동작으로 읽힌다.
 *
 * **다시 그리지 않고 글자만 바꾼다.** 900ms 동안 60번 상태를 바꾸면 그때마다
 * 화면 전체가 다시 계산된다 — 점수 하나 올리자고 할 일이 아니다.
 *
 * 화면 낭독기에는 처음부터 최종 값을 읽어 준다. 올라가는 중간값은 뜻이 없다.
 */
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
