"use client";

import { ChevronRight } from "lucide-react";

import { Sheet } from "@/components/ui/sheet";
import { CONSENT_TERMS, type ConsentKind } from "@/lib/legal";

/** 동의 한 가지의 상세내용 — 목적 · 항목 · 기간 · 거부할 권리와 불이익. 첫 시작 · 설정의 보호자 동의가 같이 쓴다 */
export function ConsentTermsSheet({
  kind,
  open,
  onClose,
}: {
  kind: ConsentKind | null;
  open: boolean;
  onClose: () => void;
}) {
  const terms = kind ? CONSENT_TERMS[kind] : null;
  return (
    <Sheet open={open} onClose={onClose} title={terms?.title ?? "상세내용"}>
      {terms && (
        <div className="pb-2">
          <p className="text-ink-soft text-sm leading-relaxed">{terms.lead}</p>
          <dl className="divide-rows border-line mt-3 border-y">
            {terms.rows.map((row) => (
              <div key={row.label} className="py-3">
                <dt className="text-caption text-ink-soft font-bold">{row.label}</dt>
                <dd className="mt-1 text-sm leading-relaxed whitespace-pre-line">{row.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm leading-relaxed font-semibold">{terms.refusal}</p>
        </div>
      )}
    </Sheet>
  );
}

/** 「상세내용 보기」 — 동의 줄 곁에 둔다 */
export function TermsLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} 상세내용 보기`}
      className="press text-signal-strong ml-auto flex min-h-11 items-center px-1 text-sm font-bold"
    >
      상세내용 보기
    </button>
  );
}

/** 카드 안의 한 줄 — 동의 이름과 「상세내용 보기」. 설정의 보호자 동의가 쓴다 */
export function TermsRow({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${title} 상세내용 보기`}
        className="press flex min-h-14 w-full items-center gap-3 py-3 text-left"
      >
        <span className="min-w-0 flex-1 text-sm font-bold">{title}</span>
        <span className="text-signal-strong text-sm font-bold">상세내용 보기</span>
        <ChevronRight className="text-faint size-4 shrink-0" aria-hidden />
      </button>
    </li>
  );
}
