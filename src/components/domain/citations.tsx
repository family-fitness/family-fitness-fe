"use client";

import { ExternalLink, PlayCircle } from "lucide-react";
import Link from "next/link";

import { videoLink } from "@/lib/videos";

const LINK =
  "text-ink-soft text-caption inline-flex min-h-11 items-start gap-1 py-1.5 leading-relaxed underline underline-offset-2";

/** 인용의 라벨 이름이 두 곳에서 다르다. */
interface CitationLike {
  index?: number;
  label?: string;
  sourceLabel?: string;
  excerpt?: string;
  url?: string | null;
}

/**
 * AI 편성 제안의 근거. 제안마다 늘 붙는다(규칙 6).
 *
 * 공단 영상 근거는 url 이 mp4 주소다. 새 창으로 바로 열면 video/mg4 로 온 파일을 브라우저가 내려받아서,
 * 앱 안 영상 화면(`/watch`)으로 연다. 그 밖(유튜브 · 문서)은 지금처럼 새 창으로 밖에서 연다
 */
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
        <span className="text-faint text-caption">근거를 불러오지 못했어요.</span>
      </p>
    );
  }

  return (
    <ol className={className}>
      {items.map((c, i) => {
        const label = c.sourceLabel ?? c.label ?? "출처";
        const link = videoLink(c.url, label);
        return (
          <li key={c.index ?? i} className="flex gap-1.5 py-1">
            <span className="text-signal-strong text-caption shrink-0 font-extrabold tabular-nums">
              [{c.index ?? i + 1}]
            </span>
            <span className="min-w-0">
              {link?.inApp ? (
                <Link href={link.href} className={LINK}>
                  {label}
                  <PlayCircle className="mt-0.5 size-3 shrink-0" aria-hidden />
                </Link>
              ) : link ? (
                <a href={link.href} target="_blank" rel="noreferrer noopener" className={LINK}>
                  {label}
                  <ExternalLink className="mt-0.5 size-2.5 shrink-0" aria-hidden />
                </a>
              ) : (
                <span className="text-ink-soft text-caption leading-relaxed">{label}</span>
              )}
              {/* 인용한 대목. 제목만 있으면 무엇을 근거로 했는지 알 수 없다 */}
              {c.excerpt && c.excerpt !== label && (
                <span className="text-faint text-micro mt-0.5 block leading-relaxed">
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
