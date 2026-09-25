/**
 * 날짜 하나를 YYYY-MM-DD 로. **기기 시간대 기준이다.**
 *
 * `toISOString()` 은 UTC 라서 한국에서는 자정부터 오전 9시까지 어제 날짜가 나온다.
 * 아침 7시에 한 운동이 전날 칸에 찍히고, 「며칠 전」 계산은 늘 하루가 밀렸다.
 */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 시각(ISO-8601) 이 기기 시간대로 며칠인지.
 *
 * 서버가 주는 `createdAt` 은 UTC 다. 앞 열 글자를 잘라 쓰면 한국 아침 8시에
 * 보낸 칭찬이 전날 것으로 세어진다.
 */
export function dayOf(timestamp: string): string {
  // 날짜만 온 값은 이미 그날이다 — 시각으로 읽으면 UTC 자정이 되어 서쪽 시간대에서 하루 앞이 된다
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? timestamp.slice(0, 10) : toDateString(d);
}

/**
 * 오늘 날짜(YYYY-MM-DD).
 *
 * 열 군데에서 각자 `new Date()` 로 날짜를 만들고 있었다.
 * 같은 화면 안에서 자정을 넘기면 위아래가 다른 날을 가리킨다.
 */
export function today(): string {
  return toDateString(new Date());
}

/** 그날로부터 며칠 지났는지. 날짜가 없으면 null */
export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  const then = new Date(`${date}T00:00:00`).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/**
 * 만 나이. 생일이 지났는지까지 본다.
 *
 * 연도만 빼면 1월생과 12월생이 같은 나이가 된다.
 * 만 14세 미만 보호자 동의와 만 4세 미만 측정 불가가 이 값에 걸려 있어서
 * 한 살 차이가 규칙을 바꾼다.
 */
export function ageOf(birthDate: string | null | undefined, on: string = today()): number | null {
  if (!birthDate) return null;
  const born = new Date(`${birthDate}T00:00:00`);
  const day = new Date(`${on}T00:00:00`);
  if (Number.isNaN(born.getTime()) || Number.isNaN(day.getTime())) return null;

  const yetToHaveBirthday =
    day.getMonth() < born.getMonth() ||
    (day.getMonth() === born.getMonth() && day.getDate() < born.getDate());
  return day.getFullYear() - born.getFullYear() - (yetToHaveBirthday ? 1 : 0);
}

/**
 * 며칠 전 날짜(YYYY-MM-DD).
 *
 * "최근 7일" 같은 구간의 시작을 잡을 때 쓴다. 화면에서 직접 `Date.now()` 를
 * 부르면 렌더마다 값이 달라져서 리액트 컴파일러가 순수하지 않다고 막는다.
 */
export function daysBefore(days: number, from: string = today()): string {
  const day = new Date(`${from}T00:00:00`);
  day.setDate(day.getDate() - days);
  return toDateString(day);
}

/** 요일 글자. `Date.getDay()` 순서(일요일이 0) */
export const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * 그날이 든 주의 월요일~일요일.
 *
 * 한 주를 월요일에 시작한다. 주말이 한 주의 끝에 붙어 있어야
 * "이번 주 주말에 같이" 가 이번 주 안에서 말이 된다.
 */
export function weekOf(date: string = today()): { from: string; to: string; days: string[] } {
  const d = new Date(`${date}T00:00:00`);
  const back = (d.getDay() + 6) % 7; // 월요일까지 며칠 거슬러 가나
  const monday = daysBefore(back, date);
  const days = Array.from({ length: 7 }, (_, i) => daysBefore(-i, monday));
  return { from: monday, to: days[6], days };
}

/** "9월 23일 화요일" */
export function longDate(date: string = today()): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}요일`;
}

/** 그날의 요일 글자 */
export function weekdayOf(date: string): string {
  return WEEKDAY[new Date(`${date}T00:00:00`).getDay()];
}

/** 요일 코드. 서버와 주고받는 값이다 — `WEEKDAY` 는 화면 글자, 이건 코드 */
const WEEKDAY_CODE = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export function weekdayCode(date: string = today()): (typeof WEEKDAY_CODE)[number] {
  return WEEKDAY_CODE[new Date(`${date}T00:00:00`).getDay()];
}

/** YYYY-MM. 그 날짜가 든 달 */
export function monthOf(date: string = today()): string {
  return date.slice(0, 7);
}

/** 몇 달 앞뒤. `shiftMonth("2026-01", -1)` → `"2025-12"` */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return toDateString(new Date(y, m - 1 + by, 1)).slice(0, 7);
}

/** 「2026년 9월」 */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

/**
 * 한 달 달력 칸. 한 주는 월요일에 시작하고, 앞뒤 빈 칸은 null 이다.
 * 캘린더가 이 칸 수대로 그린다 — 일곱의 배수로 끝난다.
 */
export function monthGrid(month: string): { from: string; to: string; cells: (string | null)[] } {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toDateString(new Date(y, m - 1, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return { from: `${month}-01`, to: toDateString(new Date(y, m - 1, days)), cells };
}
