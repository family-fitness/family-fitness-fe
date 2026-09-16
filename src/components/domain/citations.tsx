"use client";

import { ExternalLink } from "lucide-react";

/** AI 가 답한 근거. */
/** 인용의 라벨 이름이 두 곳에서 다르다. */
interface CitationLike {
  index?: number;
  label?: string;
  sourceLabel?: string;
  excerpt?: string;
  url?: string | null;
}

export function Citations({
  items,
  className,
}: {
  items: CitationLike[] | null | undefined;
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
      {items.map((c, i) => {
        const label = c.sourceLabel ?? c.label ?? "출처";
        return (
          <li key={c.index ?? i} className="flex gap-1.5 py-1">
            <span className="text-signal shrink-0 text-[0.7rem] font-extrabold tabular-nums">
              [{c.index ?? i + 1}]
            </span>
            <span className="min-w-0">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-ink-soft inline-flex items-start gap-1 text-[0.7rem] leading-relaxed underline underline-offset-2"
                >
                  {label}
                  <ExternalLink className="mt-0.5 size-2.5 shrink-0" aria-hidden />
                </a>
              ) : (
                <span className="text-ink-soft text-[0.7rem] leading-relaxed">{label}</span>
              )}
              {/* 인용한 대목. 제목만 있으면 무엇을 근거로 했는지 알 수 없다 */}
              {c.excerpt && c.excerpt !== label && (
                <span className="text-faint mt-0.5 block text-[0.68rem] leading-relaxed">
                  “{c.excerpt}”
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
