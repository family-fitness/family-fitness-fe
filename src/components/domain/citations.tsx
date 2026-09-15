"use client";

import { ExternalLink } from "lucide-react";

/**
 * AI 가 답한 근거.
 *
 * 이 서비스에서 근거 없는 AI 답변은 **버그다.** 코치가 무언가를 제안했다면
 * 국민체력100 운동처방이나 영상 중 무엇을 보고 한 말인지 항상 같이 나온다.
 *
 * 그래서 비어 있을 때 조용히 숨기지 않는다 — 숨기면 버그가 화면에서 사라져
 * 아무도 모르게 지나간다.
 */
export function Citations({
  items,
  className,
}: {
  items: { index?: number; label?: string; url?: string | null }[] | null | undefined;
  className?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <p className={className}>
        <span className="text-faint text-[0.7rem]">
          근거를 불러오지 못했어요. 이 답변은 참고만 해 주세요.
        </span>
      </p>
    );
  }

  return (
    <ol className={className}>
      {items.map((c) => (
        <li key={c.index ?? c.label} className="flex gap-1.5 py-1">
          <span className="text-signal shrink-0 text-[0.7rem] font-extrabold tabular-nums">
            [{c.index}]
          </span>
          {c.url ? (
            <a
              href={c.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-ink-soft inline-flex items-start gap-1 text-[0.7rem] leading-relaxed underline underline-offset-2"
            >
              {c.label}
              <ExternalLink className="mt-0.5 size-2.5 shrink-0" aria-hidden />
            </a>
          ) : (
            <span className="text-ink-soft text-[0.7rem] leading-relaxed">{c.label}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
