/**
 * 며칠 이어서 했는가 — 「6일째 이어서」. 부모 홈 · 아이 홈 · 가족 대시보드가 같은 칩을 쓴다.
 *
 * 이어진 것만 센다. 끊겼다는 말은 하지 않는다 — 끊긴 날이 벌이 되면 그날로 그만둔다(규칙 10).
 * 이틀부터 보인다. 하루는 「이어서」 가 아니다.
 */
export function StreakChip({ days }: { days: number }) {
  if (days < 2) return null;
  return (
    <span className="bg-mark-soft text-ink rounded-full px-2.5 py-1 font-extrabold whitespace-nowrap">
      {days}일째 이어서
    </span>
  );
}
