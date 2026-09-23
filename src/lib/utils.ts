import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * 우리 글자 크기 토큰을 tailwind-merge 에 알려 준다.
 *
 * 모르면 `text-caption` 을 글자 **색**으로 보고, 뒤에 오는 `text-ink-soft` 와 부딪친다며
 * 지워 버린다. 그래서 `cn("text-caption", "text-ink-soft")` 가 크기 없이 본문 크기로
 * 그려지고 있었다 — 작은 줄이 제목보다 크게 보이던 이유다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "caption", "body", "lead", "metric", "metric-lg"] }],
    },
  },
});

/** 조건부 클래스 + Tailwind 충돌 정리 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "8월 26일" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 한국어 조사를 앞말에 맞춰 고른다. */
const JOSA = {
  이가: ["이", "가"],
  을를: ["을", "를"],
  은는: ["은", "는"],
  와과: ["과", "와"],
} as const;

export function josa(word: string, kind: keyof typeof JOSA): string {
  const last = word.trimEnd().at(-1);
  if (!last) return JOSA[kind][1];

  const code = last.charCodeAt(0);
  // 한글 음절 영역이 아니면(숫자 · 영문 등) 받침 없음으로 본다
  if (code < 0xac00 || code > 0xd7a3) return JOSA[kind][1];

  const hasFinal = (code - 0xac00) % 28 !== 0;
  return JOSA[kind][hasFinal ? 0 : 1];
}

/** "앉아윗몸앞으로굽히기가" 처럼 붙여서 돌려준다 */
export function withJosa(word: string, kind: keyof typeof JOSA): string {
  return `${word}${josa(word, kind)}`;
}
