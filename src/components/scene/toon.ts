/**
 * 입체를 2D 에셋 결로 그리는 도구 한 벌 — 키움 섬과 업적 메달이 같이 쓴다.
 *
 *   - 면은 밝은 면 · 그늘 면 두 톤. 둘 다 CSS 토큰 색이다(`readPalette`)
 *   - 외곽선은 뒤집은 껍데기(inverted hull). 굵기는 픽셀로 맞춘다
 *   - 인스턴스로 그려도 같은 셰이더가 돈다(USE_INSTANCING)
 *
 * three 는 무거운 묶음이라 화면이 뜬 뒤에 받는다 — 여기서는 타입만 가져온다.
 */
import type * as T from "three";

export type Three = typeof T;

export interface Addons {
  mergeVertices: typeof import("three/addons/utils/BufferGeometryUtils.js").mergeVertices;
  LineSegments2: typeof import("three/addons/lines/LineSegments2.js").LineSegments2;
  LineSegmentsGeometry: typeof import("three/addons/lines/LineSegmentsGeometry.js").LineSegmentsGeometry;
  LineMaterial: typeof import("three/addons/lines/LineMaterial.js").LineMaterial;
}

/** three 와 쓰는 덧붙이를 한 번에 받는다. 화면이 뜬 뒤에 부른다 */
export async function loadThree(): Promise<{ THREE: Three; addons: Addons }> {
  const [THREE, utils, ls2, lsg, lm] = await Promise.all([
    import("three"),
    import("three/addons/utils/BufferGeometryUtils.js"),
    import("three/addons/lines/LineSegments2.js"),
    import("three/addons/lines/LineSegmentsGeometry.js"),
    import("three/addons/lines/LineMaterial.js"),
  ]);
  return {
    THREE,
    addons: {
      mergeVertices: utils.mergeVertices,
      LineSegments2: ls2.LineSegments2,
      LineSegmentsGeometry: lsg.LineSegmentsGeometry,
      LineMaterial: lm.LineMaterial,
    },
  };
}

export interface Palette {
  top: string;
  topShade: string;
  band: string;
  bandShade: string;
  base: string;
  baseShade: string;
  line: string;
  yellow: string;
  yellowShade: string;
  blue: string;
  blueShade: string;
  white: string;
  whiteShade: string;
}

/** 색은 CSS 토큰에서 읽는다. 코드에 따로 적으면 토큰을 바꿔도 입체만 옛 색으로 남는다 */
export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  // 토큰이 비어 있을 때만 쓰는 값. globals.css 와 같은 값이다
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    top: v("--color-paper", "#ffffff"),
    topShade: v("--color-sub", "#f1f3f6"),
    band: v("--color-signal", "#2784e6"),
    bandShade: v("--color-signal-strong", "#1a6fd1"),
    base: v("--color-signal-soft", "#eaf3fd"),
    baseShade: v("--color-signal-pale", "#d4e5f9"),
    line: v("--color-signal-deep", "#1b2574"),
    yellow: v("--color-mark", "#ffb800"),
    yellowShade: v("--color-mark-shade", "#e0a100"),
    blue: v("--color-signal", "#2784e6"),
    blueShade: v("--color-signal-strong", "#1a6fd1"),
    white: v("--color-paper", "#ffffff"),
    whiteShade: v("--color-sub", "#f1f3f6"),
  };
}

const LOCAL = /* glsl */ `
  #ifdef USE_INSTANCING
    mat4 local = instanceMatrix;
  #else
    mat4 local = mat4(1.0);
  #endif
`;

const TOON_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    ${LOCAL}
    vNormal = normalize(mat3(modelMatrix) * mat3(local) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * local * vec4(position, 1.0);
  }
`;

/** 밝은 면과 그늘 면 두 톤. 빛 방향은 카메라에 붙어 있어서 물체를 돌려도 왼쪽 위가 밝다 */
const TOON_FRAGMENT = /* glsl */ `
  uniform vec3 lit;
  uniform vec3 shade;
  uniform vec3 light;
  uniform float cut;
  varying vec3 vNormal;
  void main() {
    float d = dot(normalize(vNormal), light);
    gl_FragColor = vec4(d > cut ? lit : shade, 1.0);
    #include <colorspace_fragment>
  }
`;

/** 뒤집은 껍데기를 화면 쪽으로만 밀어 외곽선을 낸다. 정사영이라 굵기가 어디서나 같다 */
const HULL_VERTEX = /* glsl */ `
  uniform float thickness;
  void main() {
    ${LOCAL}
    vec3 n = normalize(normalMatrix * mat3(local) * normal);
    vec4 mv = modelViewMatrix * local * vec4(position, 1.0);
    mv.xy += n.xy * thickness;
    gl_Position = projectionMatrix * mv;
  }
`;

const HULL_FRAGMENT = /* glsl */ `
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface ToonKit {
  /** 치울 것을 모아 둔다 */
  keep<D extends { dispose(): void }>(d: D): D;
  /** 두 톤 재질. 같은 색 조합은 하나를 나눠 쓴다 */
  toon(lit: string, shade: string, offset?: boolean, cut?: number): T.ShaderMaterial;
  /** 굵은 외곽선 · 가는 외곽선 */
  hull: T.ShaderMaterial;
  hullThin: T.ShaderMaterial;
  /** 모서리를 합친 매끈한 법선의 껍데기. 같은 모양은 한 번만 짓는다 */
  hullGeometry(geometry: T.BufferGeometry): T.BufferGeometry;
  /** 면 + 굵은 외곽선 한 벌 */
  solid(geometry: T.BufferGeometry, material: T.Material | T.Material[]): T.Mesh;
  /** 캔버스 한 칸이 세계 몇 단위인지 알려 주면 외곽선 굵기를 픽셀로 맞춘다 */
  setPixelsPerUnit(perUnit: number): void;
  dispose(): void;
}

export function toonKit(
  THREE: Three,
  addons: Addons,
  palette: Palette,
  light: T.Vector3,
  /** 외곽선 굵기(픽셀) — 굵게 · 가늘게 */
  widths: [number, number] = [3, 2.2],
): ToonKit {
  const disposables: { dispose(): void }[] = [];
  const keep = <D extends { dispose(): void }>(d: D) => {
    disposables.push(d);
    return d;
  };

  const lightUniform = { value: light };
  const thickness = { value: 0.06 };
  const thin = { value: 0.045 };

  const toons = new Map<string, T.ShaderMaterial>();
  const toon = (lit: string, shade: string, offset = false, cut = 0.12) => {
    const key = `${lit}/${shade}/${offset}/${cut}`;
    const found = toons.get(key);
    if (found) return found;
    const material = keep(
      new THREE.ShaderMaterial({
        uniforms: {
          lit: { value: new THREE.Color(lit) },
          shade: { value: new THREE.Color(shade) },
          light: lightUniform,
          cut: { value: cut },
        },
        vertexShader: TOON_VERTEX,
        fragmentShader: TOON_FRAGMENT,
        // 면을 살짝 뒤로 — 모서리 선이 면에 파묻히지 않게
        polygonOffset: offset,
        polygonOffsetFactor: offset ? 1 : 0,
        polygonOffsetUnits: offset ? 1 : 0,
      }),
    );
    toons.set(key, material);
    return material;
  };

  const hullMaterial = (width: { value: number }) =>
    keep(
      new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(palette.line) }, thickness: width },
        vertexShader: HULL_VERTEX,
        fragmentShader: HULL_FRAGMENT,
        side: THREE.BackSide,
      }),
    );
  const hull = hullMaterial(thickness);
  const hullThin = hullMaterial(thin);

  const hulls = new Map<T.BufferGeometry, T.BufferGeometry>();
  const hullGeometry = (geometry: T.BufferGeometry) => {
    // 노랑 · 파랑 나무처럼 같은 모양을 두 색이 쓴다. 껍데기는 하나면 된다
    const found = hulls.get(geometry);
    if (found) return found;
    const bare = geometry.clone();
    bare.deleteAttribute("normal");
    bare.deleteAttribute("uv");
    const merged = addons.mergeVertices(bare);
    merged.computeVertexNormals();
    merged.clearGroups();
    bare.dispose();
    hulls.set(geometry, merged);
    return keep(merged);
  };

  const solid = (geometry: T.BufferGeometry, material: T.Material | T.Material[]) => {
    keep(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.add(new THREE.Mesh(hullGeometry(geometry), hull));
    return mesh;
  };

  return {
    keep,
    toon,
    hull,
    hullThin,
    hullGeometry,
    solid,
    setPixelsPerUnit(perUnit) {
      thickness.value = widths[0] / perUnit;
      thin.value = widths[1] / perUnit;
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
