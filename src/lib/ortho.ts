/**
 * 정사영 카메라의 셈. three 없이 한 점이 화면 어디에 오는지 안다.
 *
 * 입체 그래프의 글자(분 · 요일 · 백분위)는 캔버스에 그리지 않고 DOM 으로 얹는다 —
 * 화면 읽기 프로그램이 읽고, 확대해도 번지지 않는다. 그 자리를 셈하는 곳이 여기다.
 * three 가 오기 전에도 글자는 제자리에 먼저 선다.
 *
 * 정사영이라 **세로 길이가 어디서나 같은 비율**이다 — 앞 기둥이 뒤 기둥보다 커 보이지 않는다.
 * 입체 그래프가 값을 속이지 않는 까닭이 이것이다.
 */
export interface OrthoSpec {
  /** 높이각(도). 0 이면 정면 */
  elevation: number;
  /** 방위각(도). 0 이면 +z 쪽에서 본다 */
  azimuth: number;
  /** 카메라가 보는 높이 */
  target?: number;
  /** 화면 반높이(세계 단위) */
  view: number;
}

type Vec3 = readonly [number, number, number];

/** 화면 오른쪽 · 위 방향(세계 좌표) */
function orthoBasis(spec: OrthoSpec): { right: Vec3; up: Vec3 } {
  const el = (spec.elevation * Math.PI) / 180;
  const az = (spec.azimuth * Math.PI) / 180;
  return {
    right: [Math.cos(az), 0, -Math.sin(az)],
    up: [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)],
  };
}

/** 세계 좌표 한 점 → 캔버스 위 CSS 픽셀 */
export function projectOrtho(
  spec: OrthoSpec,
  point: Vec3,
  width: number,
  height: number,
): { x: number; y: number } {
  const { right, up } = orthoBasis(spec);
  const d: Vec3 = [point[0], point[1] - (spec.target ?? 0), point[2]];
  const sx = d[0] * right[0] + d[1] * right[1] + d[2] * right[2];
  const sy = d[0] * up[0] + d[1] * up[1] + d[2] * up[2];
  const perUnit = height / (2 * spec.view);
  return { x: width / 2 + sx * perUnit, y: height / 2 - sy * perUnit };
}
