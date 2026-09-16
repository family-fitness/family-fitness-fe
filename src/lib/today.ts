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
