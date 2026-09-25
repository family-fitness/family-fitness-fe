/**
 * 며칠 이어서 했는가 — 「6일째 이어서」. 부모 홈 · 아이 홈 · 가족 대시보드가 같은 글자를 쓴다.
 * 둥근 바탕(알약)에 넣지 않는다 — AI 가 만든 화면의 흔한 모양이다(9/25). 진한 파랑 글자로만 띄운다.
 *
 * 이어진 것만 센다. 끊겼다는 말은 하지 않는다 — 끊긴 날이 벌이 되면 그날로 그만둔다(규칙 10).
 * 이틀부터 보인다. 하루는 「이어서」 가 아니다.
 */
export function StreakChip({ days }: { days: number }) {
  if (days < 2) return null;
  return (
    <span className="text-signal-deep font-extrabold whitespace-nowrap">{days}일째 이어서</span>
  );
}
