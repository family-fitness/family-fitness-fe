/**
 * 오늘 날짜(YYYY-MM-DD).
 *
 * 열 군데에서 각자 `new Date().toISOString().slice(0, 10)` 을 부르고 있었다.
 * 같은 화면 안에서 자정을 넘기면 위아래가 다른 날을 가리킨다.
 */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
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
