/**
 * 섬 꾸미기 — 레벨마다 하나씩 열리는 장식(`lib/unlocks.ts`).
 *
 * 섬과 같은 결이다: 두 톤 · 굵은 남색 외곽선 · CSS 토큰 색. 모양은 단순한 도형 몇 개로만 —
 * 헬스 앱 그림처럼 한눈에 무엇인지 알 만큼.
 *
 * 자리는 미리 정해 두고 **나무가 그 자리를 늘 비워 둔다**(`island.ts` 의 `slotsFor`).
 * 장식이 열릴 때마다 나무가 옮겨 다니면 내 섬이 아니다.
 * 키 큰 장식(풍차 · 등대)은 캐릭터 뒤 양옆에 — 캐릭터 머리 위로 솟으면 모자처럼 보인다.
 */
import type * as T from "three";

import type { DecorationId } from "@/lib/unlocks";

import type { Palette, Three, ToonKit } from "./toon";

/**
 * 장식 자리 — 처음 보는 방향(카메라 쪽)에서 몇 도 돌았나(오른쪽 +), 가운데서 얼마나 떨어졌나.
 * 섬 반지름은 2.5, 캐릭터는 가운데에 선다.
 */
export const DECOR_SPOTS: Record<DecorationId, { turn: number; r: number }> = {
  flag: { turn: -78, r: 1.78 },
  fence: { turn: 42, r: 1.78 },
  pond: { turn: -28, r: 1.42 },
  tent: { turn: 88, r: 1.72 },
  windmill: { turn: -128, r: 1.62 },
  lighthouse: { turn: 128, r: 1.62 },
};

/** 나무가 장식 자리에서 떨어져야 하는 거리 */
export const DECOR_CLEAR = 0.62;

/** 장식 하나 — 서 있기만 한다(풍차도 돌지 않는다, 떠다니는 움직임 없음) */
export interface Decoration {
  group: T.Group;
}

export function buildDecoration(
  THREE: Three,
  kit: ToonKit,
  palette: Palette,
  id: DecorationId,
): Decoration {
  const { toon, solid, keep } = kit;
  const white = toon(palette.white, palette.whiteShade);
  const blue = toon(palette.blue, palette.blueShade);
  const yellow = toon(palette.yellow, palette.yellowShade);
  const navy = toon(palette.line, palette.line);
  const pale = toon(palette.base, palette.baseShade);
  const group = new THREE.Group();

  /** 기둥 하나 — 아래가 0 에 닿게 */
  const column = (top: number, bottom: number, height: number, sides: number) => {
    const g = new THREE.CylinderGeometry(top, bottom, height, sides);
    g.translate(0, height / 2, 0);
    return g;
  };
  /** 얇은 삼각 판(깃발 천 · 텐트 문) */
  const triangle = (points: [number, number][], depth: number) => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return keep(g);
  };

  switch (id) {
    case "flag": {
      group.add(solid(column(0.13, 0.15, 0.08, 6), white));
      const pole = solid(column(0.028, 0.028, 1.02, 8), navy);
      group.add(pole);
      const cloth = solid(
        triangle(
          [
            [0, 0],
            [0.46, -0.15],
            [0, -0.3],
          ],
          0.03,
        ),
        yellow,
      );
      cloth.position.set(0.028, 1.0, 0);
      group.add(cloth);
      return { group };
    }
    case "fence": {
      // 가장자리를 따라 선다 — 놓을 때 섬 중심을 향해 돌려 둔다(여기서 x 가 가장자리 방향)
      const post = keep(new THREE.BoxGeometry(0.08, 0.36, 0.08));
      post.translate(0, 0.18, 0);
      for (const x of [-0.42, 0, 0.42]) {
        const p = solid(post, white);
        p.position.x = x;
        group.add(p);
      }
      const rail = keep(new THREE.BoxGeometry(0.92, 0.06, 0.05));
      for (const y of [0.13, 0.27]) {
        const r = solid(rail, white);
        r.position.y = y;
        group.add(r);
      }
      return { group };
    }
    case "pond": {
      // 섬 윗면 바로 위의 물. 가장자리 돌 둘
      const water = solid(column(0.5, 0.5, 0.035, 28), blue);
      group.add(water);
      const stone = keep(new THREE.SphereGeometry(0.1, 12, 8));
      stone.scale(1, 0.55, 1);
      for (const [x, z, s] of [
        [0.46, 0.18, 1],
        [0.36, 0.36, 0.75],
      ] as const) {
        const m = solid(stone, pale);
        m.position.set(x, 0.03, z);
        m.scale.setScalar(s);
        group.add(m);
      }
      // 물 위 잎 하나 — 흰 동그라미
      const pad = solid(column(0.11, 0.11, 0.02, 16), white);
      pad.position.set(-0.14, 0.035, 0.08);
      group.add(pad);
      return { group };
    }
    case "tent": {
      // 세모 기둥을 눕힌 텐트 — 앞이 이쪽을 본다
      // 세모 기둥을 앞뒤로 눕히고(꼭짓점이 아래로 온다) 뒤집어 꼭짓점을 위로. 밑변이 바닥에 닿게
      const body = keep(new THREE.CylinderGeometry(0.4, 0.4, 0.72, 3));
      body.rotateX(Math.PI / 2);
      body.rotateZ(Math.PI);
      body.translate(0, 0.2, 0);
      group.add(solid(body, yellow));
      const door = solid(
        triangle(
          [
            [-0.13, 0],
            [0.13, 0],
            [0, 0.3],
          ],
          0.02,
        ),
        navy,
      );
      door.position.set(0, 0.0, 0.37);
      group.add(door);
      return { group };
    }
    case "windmill": {
      group.add(solid(column(0.15, 0.25, 0.95, 8), white));
      const cap = keep(new THREE.ConeGeometry(0.21, 0.3, 8));
      cap.translate(0, 1.1, 0);
      group.add(solid(cap, blue));
      // 날개 넷 — 이쪽(섬 앞)을 보고 돈다
      const hub = new THREE.Group();
      hub.position.set(0, 0.86, 0.2);
      const blade = keep(new THREE.BoxGeometry(0.1, 0.46, 0.025));
      blade.translate(0, 0.27, 0);
      for (let k = 0; k < 4; k++) {
        const b = solid(blade, k % 2 === 0 ? white : yellow);
        b.rotation.z = (k * Math.PI) / 2;
        hub.add(b);
      }
      const axle = keep(new THREE.SphereGeometry(0.06, 12, 8));
      hub.add(solid(axle, navy));
      group.add(hub);
      return { group };
    }
    case "lighthouse": {
      // 흰 · 파랑 띠 셋, 노란 등, 남색 지붕
      const bands: [number, number, number, T.ShaderMaterial][] = [
        [0.24, 0.2, 0.36, white],
        [0.2, 0.17, 0.34, blue],
        [0.17, 0.14, 0.32, white],
      ];
      let y = 0;
      for (const [bottom, top, h, material] of bands) {
        const part = solid(column(top, bottom, h, 12), material);
        part.position.y = y;
        group.add(part);
        y += h;
      }
      const lamp = solid(column(0.13, 0.13, 0.18, 12), yellow);
      lamp.position.y = y;
      group.add(lamp);
      const roof = keep(new THREE.ConeGeometry(0.18, 0.2, 12));
      roof.translate(0, y + 0.28, 0);
      group.add(solid(roof, navy));
      return { group };
    }
  }
}

/** 섬 윗면 위의 자리. 처음 보는 방향이 `front`(라디안) */
export function decorationSpot(
  id: DecorationId,
  front: number,
): { x: number; z: number; a: number } {
  const spot = DECOR_SPOTS[id];
  const a = front + (spot.turn * Math.PI) / 180;
  return { x: Math.sin(a) * spot.r, z: Math.cos(a) * spot.r, a };
}
