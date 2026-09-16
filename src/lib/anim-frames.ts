/**
 * 동작별로 쓸 수 있는 프레임 번호. **손으로 고치지 않는다** —
 * `node scripts/prepare-assets.mjs` 가 에셋을 넣을 때 다시 쓴다.
 *
 * 격자로 잘못 뽑힌 장은 여기 안 실린다 — 화면이 알아서 건너뛴다.
 */
export const ANIM_FRAMES: Record<string, number[]> = {
  cheer: [1, 2, 3, 4, 5, 6, 7, 8],
  idle: [1, 2, 3, 4, 5, 6, 7, 8],
  jump: [1, 2, 3, 4, 5, 6, 7, 8],
  run: [2, 5, 6],
  squat: [2, 3, 4, 5, 6, 7, 8],
  stretch: [1, 2, 3, 4, 5, 6, 7],
  tired: [2, 3, 4, 5, 6, 7, 8],
  wave: [1, 2, 8],
};
