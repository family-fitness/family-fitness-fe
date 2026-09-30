import { daysBefore, toDateString, today } from "@/lib/today";

/**
 * 날짜 고르기(`DateField`)가 쓰는 순수 계산. 값은 늘 YYYY-MM-DD 문자열이다.
 *
 * 달력 라이브러리는 `Date` 를 주고받는다. `new Date("2018-03-05")` 는 UTC 자정이라
 * 서쪽 시간대에서 하루 앞 날이 되므로, 여기서만 기기 시간대 자정으로 바꾼다.
 */

/** YYYY-MM-DD 를 기기 시간대 자정의 `Date` 로. 비었거나 틀린 값이면 undefined */
export function parseDate(date: string | null | undefined): Date | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) || toDateString(d) !== date ? undefined : d;
}

/** 「2018년 3월 5일」. 틀린 값은 그대로 돌려준다 */
export function koreanDate(date: string): string {
  const d = parseDate(date);
  if (!d) return date;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/**
 * 몇 해 전 같은 날(YYYY-MM-DD). 2월 29일에서 윤년이 아닌 해로 가면 2월 28일이다.
 * 생일 달력을 처음 열 때 보여 줄 해를 잡는 데 쓴다.
 */
export function yearsBefore(years: number, from: string = today()): string {
  const [y, m, d] = from.split("-").map(Number);
  const last = new Date(y - years, m, 0).getDate();
  return toDateString(new Date(y - years, m - 1, Math.min(d, last)));
}

/** 날짜 고르기마다 고를 수 있는 범위와 처음 보여 줄 날. 모두 YYYY-MM-DD */
export type DateRule = { min: string; max: string; start: string };

/**
 * 아이 생일. 지금 가입 폼 규칙 그대로 오늘부터 만 19세(365*19+5일 전)까지다.
 * 처음 열면 8년 전 달을 보여 준다(초등학생 나이).
 */
export function childBirthRule(on: string = today()): DateRule {
  return { min: daysBefore(365 * 19 + 5, on), max: on, start: yearsBefore(8, on) };
}

/**
 * 보호자 생일. 지금 폼은 「오늘까지」 만 막으므로 최대치는 그대로 두고,
 * 연도 목록이 끝없이 길지 않게 100년 전까지만 보인다. 처음 열면 35년 전 달이다.
 */
export function guardianBirthRule(on: string = today()): DateRule {
  return { min: yearsBefore(100, on), max: on, start: yearsBefore(35, on) };
}

/**
 * 측정한 날짜. 오늘까지이고, 센터 결과지를 늦게 옮겨 적는 경우를 넉넉히 봐서 5년 전까지 고른다.
 * 처음 열면 이번 달이다.
 */
export function measuredRule(on: string = today()): DateRule {
  return { min: yearsBefore(5, on), max: on, start: on };
}

/**
 * 달력을 처음 열 때 보여 줄 달의 날. 고른 값이 범위 안이면 그 값, 아니면 `start` 를 범위 안으로 당긴 날.
 */
export function openingDate(rule: DateRule, value: string | null | undefined): string {
  if (value && parseDate(value) && value >= rule.min && value <= rule.max) return value;
  if (rule.start < rule.min) return rule.min;
  if (rule.start > rule.max) return rule.max;
  return rule.start;
}

/** 범위 안의 날인가. 빈 값과 틀린 값은 아니다 */
export function inRule(rule: DateRule, value: string | null | undefined): boolean {
  return !!value && !!parseDate(value) && value >= rule.min && value <= rule.max;
}
