import type { AvailabilitySlot, Weekday } from "./api/types";
import { withJosa } from "./utils";

/**
 * 운동할 수 있는 시간(운동 시간표)이 가족끼리 겹치는 요일.
 *
 * 「같이」 는 아이와 보호자 시간표가 겹치는 날에만 한다(사용자 결정). 시간표를 아예 비워 둔
 * 사람은 아직 적지 않은 것이라 그 사람 때문에 막지 않는다. 시간표는 혼자 하는 운동을 막는 데 쓰지 않는다.
 */

/** 한 주, 월요일부터 */
export const WEEK: readonly Weekday[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const LABEL: Record<Weekday, string> = {
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

/** 요일 글자. 「월」 */
export function dayLabel(day: Weekday): string {
  return LABEL[day];
}

/** 한 사람의 이름과 한 주 */
export interface PersonWeek {
  name: string;
  slots: readonly AvailabilitySlot[];
}

const has = (slots: readonly AvailabilitySlot[], day: Weekday) => slots.some((s) => s.day === day);

/**
 * 여러 사람이 모두 운동할 수 있는 요일, 월요일부터.
 * 시간표를 아예 비워 둔 사람은 빼고 본다. 모두 비워 뒀거나 아무도 없으면 빈 목록
 */
export function sharedDays(weeks: readonly (readonly AvailabilitySlot[])[]): Weekday[] {
  const written = weeks.filter((w) => w.length > 0);
  if (written.length === 0) return [];
  return WEEK.filter((day) => written.every((w) => has(w, day)));
}

/**
 * 그 요일에 「{보호자}도 같이」 를 켤 수 없는 까닭 한 줄. 켤 수 있으면 null.
 *
 * - 보호자 시간표가 아예 비어 있으면 막지 않는다
 * - 아이 시간표가 아예 비어 있으면 보호자 시간표만 본다
 * - 그 밖에는 둘 다 그 요일을 적어 뒀어야 한다. 빠진 사람을 이름으로 부른다
 */
export function togetherBlock(day: Weekday, kid: PersonWeek, guardian: PersonWeek): string | null {
  if (guardian.slots.length === 0) return null;
  const off = [kid, guardian].filter((p) => p.slots.length > 0 && !has(p.slots, day));
  if (off.length === 0) return null;
  const who = off.length === 2 ? `${withJosa(off[0].name, "와과")} ${off[1].name}` : off[0].name;
  return `${dayLabel(day)}요일은 ${withJosa(who, "이가")} 운동할 수 있는 날이 아니라서 같이 할 수 없어요`;
}

/**
 * 어떤 보호자와도 겹치는 요일이 없는 아이들의 이름.
 * 시간표를 비워 둔 아이는 찾지 않는다. 시간표를 비워 둔 보호자가 있으면 그 보호자와는 막히지 않으니 찾지 않는다
 */
export function aloneKids(kids: readonly PersonWeek[], guardians: readonly PersonWeek[]): string[] {
  if (guardians.length === 0 || guardians.some((g) => g.slots.length === 0)) return [];
  return kids
    .filter((k) => k.slots.length > 0)
    .filter((k) => guardians.every((g) => sharedDays([k.slots, g.slots]).length === 0))
    .map((k) => k.name);
}

/** 겹치는 요일이 없는 아이가 있을 때 저장하고 나서 알리는 한 줄. 없으면 null */
export function aloneNotice(names: readonly string[]): string | null {
  if (names.length === 0) return null;
  return `${withJosa(names.join(", "), "와과")} 보호자가 겹치는 요일이 없어요. 같이 운동하려면 요일을 하나 이상 맞춰 주세요`;
}
