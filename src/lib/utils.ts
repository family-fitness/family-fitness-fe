import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 조건부 클래스 + Tailwind 충돌 정리 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 생일로 만 나이를 센다 */
export function calcAge(birthDate: string, today = new Date()): number {
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age -= 1;
  return age;
}

/** "8월 26일" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 초를 "5:12" 로 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 분을 "1시간 5분" 으로. 사람이 읽는 자리에 쓴다 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/**
 * 한국어 조사를 앞말에 맞춰 고른다.
 *
 * 항목 이름이 데이터에서 오기 때문에 조사를 하드코딩할 수 없다.
 * "윗몸말아올리기가" 와 "악력이" 가 둘 다 나와야 한다.
 *
 * 받침 판정은 한글 음절 코드로 한다. (code - 0xAC00) % 28 이 0 이면 받침이 없다.
 */
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
