/**
 * 놀이터 무대 — 키움 섬을 줄인 작은 섬 위에 키움이 종이 인형 하나.
 * 얼음땡 · 따라 해 봐가 같이 쓴다. 무대 위에서 무엇을 하는지는 놀이마다 다르다.
 */
import type * as T from "three";

import type { BuddyFrame } from "./buddy";
import { mascotImage } from "./kium-island";
import type { CameraSpec, SceneContext } from "./use-toon-scene";

/**
 * 무대 카메라 — 섬 밑동 끝(아래)부터 가장 높이 뛴 새싹(위)까지 한 화면에 든다.
 * 밑동 끝이 캔버스 가장자리에 걸리면 외곽선이 잘려 섬이 잘린 것처럼 보인다.
 */
export const PLAY_CAMERA: CameraSpec = { elevation: 24, azimuth: 0, target: 0.47, view: 1.65 };

/** 키움이 키(발끝~모자 꼭대기, 세계 단위) */
export const BUDDY = 1.2;
/** 그림 한 장의 크기 — 몸이 BUDDY 가 되게. 그림마다 몸 비율이 달라 비율로 나눈다 */
export const buddyScale = (frame: BuddyFrame) => BUDDY / frame.body;

export interface PlayStage {
  /** 키움이가 서는 자리 — 카메라 쪽으로 살짝 당겨 두었다 */
  figure: T.Group;
  /** 남색 굵은 선 한 벌 */
  lines(geometry: T.BufferGeometry): T.Object3D;
  resize(width: number, height: number): void;
  dispose(): void;
}

/**
 * 무대를 짓고, 대신 세워 둔 그림들(`stands`)로 키움이 종이 인형을 만든다.
 * 그림은 늦게 오므로 다 오면 `onSprites` 로 넘긴다 — 순서는 `stands` 와 같다.
 */
export function buildPlayStage(
  { THREE, addons, kit, palette, scene, toward, invalidate }: SceneContext,
  stands: (HTMLElement | null)[],
  onSprites: (sprites: T.Sprite[]) => void,
  frame: BuddyFrame,
): PlayStage {
  const { keep, toon, solid } = kit;
  const edge = keep(
    new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
  );
  const lines = (g: T.BufferGeometry) =>
    new addons.LineSegments2(
      keep(
        new addons.LineSegmentsGeometry().fromEdgesGeometry(keep(new THREE.EdgesGeometry(g, 25))),
      ),
      edge,
    );

  const slab = new THREE.CylinderGeometry(1.3, 1.3, 0.24, 6);
  slab.translate(0, -0.12, 0);
  const band = toon(palette.band, palette.bandShade, true);
  scene.add(solid(slab, [band, toon(palette.top, palette.topShade, true), band]), lines(slab));
  const under = new THREE.CylinderGeometry(1.24, 0.42, 0.8, 6);
  under.translate(0, -0.24 - 0.4, 0);
  scene.add(solid(under, toon(palette.base, palette.baseShade, true, -0.3)), lines(under));

  const figure = new THREE.Group();
  figure.position.copy(toward).multiplyScalar(0.3);
  scene.add(figure);

  let gone = false;
  void Promise.all(stands.map((s) => (s ? mascotImage(s) : Promise.resolve(null)))).then(
    (images) => {
      if (gone) return;
      const sprites = images.map((image) => {
        const texture = image ? keep(new THREE.Texture(image)) : null;
        if (texture) {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
        }
        const sprite = new THREE.Sprite(
          keep(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.35 })),
        );
        sprite.center.set(0.5, frame.feet);
        sprite.scale.set(buddyScale(frame), buddyScale(frame), 1);
        return sprite;
      });
      sprites.forEach((s, i) => {
        s.visible = i === 0;
        figure.add(s);
      });
      onSprites(sprites);
      invalidate();
    },
  );

  return {
    figure,
    lines,
    resize(width, height) {
      edge.resolution.set(width, height);
    },
    dispose() {
      gone = true;
    },
  };
}
