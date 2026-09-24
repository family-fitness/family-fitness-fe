/**
 * 놀이터 놀이에 쓰는 동작들. 집 안에서, 도구 없이, 초등학생이 혼자 해도 안전한 것만.
 *
 * 놀이는 기록을 남기지 않는다 — 점수 · 순위 · 연속 기록 없이 그냥 논다.
 * 오늘 운동(TIMER · 영상으로 확인되는 것)과 섞지 않는다(규칙 2).
 */

/** 따라 해 봐 — 순서를 기억해 따라 하는 짧은 동작 */
export const FOLLOW_MOVES = [
  "박수 두 번",
  "만세",
  "제자리 뛰기 한 번",
  "한 발 들기",
  "무릎 두 번 치기",
  "한 바퀴 돌기",
  "발 구르기 두 번",
  "어깨 으쓱",
] as const;

/** 따라 해 봐 한 판의 끝 — 여섯 개를 기억하면 */
export const FOLLOW_ROUNDS = 6;

/** 0 이상 n 미만의 고른 정수 */
export function pick(n: number, avoid?: number): number {
  const draw = () => {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % n;
  };
  const first = draw();
  // 같은 게 바로 또 나오면 한 번만 다시 — 뽑기다운 우연은 남기되 연달아 같은 건 덜 나오게
  return first === avoid && n > 1 ? draw() : first;
}

/** 따라 해 봐 순서 — 앞 판 순서에 하나를 덧붙인다. 바로 앞 동작과 같은 건 피한다 */
export function extendSequence(sequence: readonly number[]): number[] {
  const last = sequence.at(-1);
  let next = pick(FOLLOW_MOVES.length, last);
  if (next === last) next = (next + 1) % FOLLOW_MOVES.length;
  return [...sequence, next];
}
