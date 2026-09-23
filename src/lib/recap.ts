import type { AchievementView, DayLog } from "./api/types";
import { dayOf } from "./today";

/**
 * 지난주 돌아보기 — 삼성헬스 「주간 리포트」 처럼, 한 주가 시작될 때 지난 한 주를 짧게.
 *
 * **해낸 것만 적는다.** 지난주보다 적었다 · 빠진 날이 있었다 같은 말은 셈하지도 않는다
 * (죄책감을 주지 않는다). 움직인 날 · 분 · 가장 많이 한 날 · 받은 스티커 · 새 업적.
 * 적을 것이 하나도 없으면(`isEmpty`) 카드를 띄우지 않는다 — 「쉬었다」 고도 말하지 않는다.
 * 쉬었는지 이제 막 온 집인지 우리는 모른다.
 */
export interface WeekRecap {
  /** 움직인 날 */
  days: number;
  minutes: number;
  /** 가장 많이 움직인 날. 하루도 없으면 null */
  best: { date: string; minutes: number } | null;
  stickers: number;
  /** 그 주에 받은 업적 이름(서버가 지은 이름 그대로) */
  badges: string[];
}

export function weekRecap(
  logs: readonly DayLog[],
  achievements: readonly AchievementView[],
  range: { from: string; to: string },
): WeekRecap {
  const inWeek = logs.filter((l) => l.date >= range.from && l.date <= range.to);
  const moved = inWeek.filter((l) => l.minutes > 0);
  const best = moved.reduce<{ date: string; minutes: number } | null>(
    // 같은 분이면 이른 날 — 받은 차례와 상관없이 늘 같은 답이 나오게
    (top, l) =>
      !top || l.minutes > top.minutes || (l.minutes === top.minutes && l.date < top.date)
        ? { date: l.date, minutes: l.minutes }
        : top,
    null,
  );
  const badges = achievements
    .filter((a) => a.earnedAt && dayOf(a.earnedAt) >= range.from && dayOf(a.earnedAt) <= range.to)
    .map((a) => a.title);
  return {
    days: moved.length,
    minutes: moved.reduce((sum, l) => sum + l.minutes, 0),
    best,
    stickers: inWeek.reduce((sum, l) => sum + l.stickers.length, 0),
    badges,
  };
}

/** 적을 것이 하나도 없나 */
export function isEmpty(recap: WeekRecap): boolean {
  return recap.days === 0 && recap.stickers === 0 && recap.badges.length === 0;
}

/** 「9월 14일 ~ 20일」 · 달이 바뀌면 「8월 31일 ~ 9월 6일」 */
export function rangeLabel(from: string, to: string): string {
  const [, fm, fd] = from.split("-").map(Number);
  const [, tm, td] = to.split("-").map(Number);
  return fm === tm ? `${fm}월 ${fd}일 ~ ${td}일` : `${fm}월 ${fd}일 ~ ${tm}월 ${td}일`;
}
