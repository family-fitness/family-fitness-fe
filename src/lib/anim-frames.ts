/**
 * 동작별 프레임 수. **손으로 고치지 않는다** —
 * `node scripts/prepare-assets.mjs` 가 에셋을 넣을 때 다시 쓴다.
 *
 * 프레임을 늘리면 이 숫자가 따라 오르고 화면이 알아서 부드러워진다.
 */
export const ANIM_FRAMES: Record<string, number> = {
  cheer: 3,
  idle: 3,
  jump: 3,
  run: 3,
  squat: 3,
  stretch: 3,
  tired: 3,
  wave: 3,
};
