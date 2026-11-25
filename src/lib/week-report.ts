import type { WeeklyReport } from "./api/types";
import { daysBefore, weekOf } from "./today";
import { formatDate } from "./utils";

/**
 * 주간 돌아보기 — 월요일부터 일요일까지 한 주. 값은 서버 주간 요약(`GET /families/{id}/report/weekly`) 그대로 쓴다.
 *
 * 운동 시간은 「확인된 시간」(타이머 · 영상) 이다. 가족 대시보드 · 달력이 세는 분과 같아야 같은 날이 두 화면에서
 * 다른 수가 되지 않는다. 직접 적은 걸음수는 분으로 세지 않는다(규칙 2).
 * 응원 수는 쓰지 않는다 — 서버는 아이가 보낸 「알리기」 까지 함께 세어 「받은 칭찬」 이라 부를 수 없다.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 주소의 `?week=` 를 그 주의 월요일로. 틀린 값 · 앞날이면 지난주다 — 지나간 주를 돌아보는 화면이다 */
export function weekParam(raw: string | null | undefined, now: string): string {
  const thisWeek = weekOf(now).from;
  if (!raw || !DATE.test(raw) || Number.isNaN(new Date(`${raw}T00:00:00`).getTime())) {
    return shiftWeek(thisWeek, -1);
  }
  const monday = weekOf(raw).from;
  return monday > thisWeek ? shiftWeek(thisWeek, -1) : monday;
}

/** 몇 주 앞뒤로 */
export function shiftWeek(weekStart: string, by: number): string {
  return daysBefore(-7 * by, weekStart);
}

/** 이번 주인가 — 다음 주로는 넘기지 않는다 */
export function isThisWeek(weekStart: string, now: string): boolean {
  return weekStart >= weekOf(now).from;
}

/** 「11월 16일 ~ 11월 22일」 */
export function weekRangeLabel(weekStart: string): string {
  return `${formatDate(weekStart)} ~ ${formatDate(daysBefore(-6, weekStart))}`;
}

/** 가족 한 주 — 확인된 운동 시간 합과 끝낸 운동 수. 아무도 움직이지 않았으면 moved 가 false */
export function familyWeek(report: WeeklyReport | undefined): {
  minutes: number;
  completed: number;
  moved: boolean;
} {
  const minutes = (report?.members ?? []).reduce((sum, m) => sum + (m.verifiedMinutes ?? 0), 0);
  const completed = report?.missionStats?.completed ?? 0;
  return { minutes, completed, moved: minutes > 0 || completed > 0 };
}
