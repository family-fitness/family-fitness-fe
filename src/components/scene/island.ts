/**
 * 키움 섬 — 운동한 날마다 나무가 하나씩 자라는 떠 있는 섬.
 *
 * 이 파일은 장면만 짓는다. 그리기 · 돌리기 · 멈추기는 `kium-island.tsx` 가 한다.
 * three 는 무거운 묶음이라 화면이 뜬 뒤에 받는다 — 여기서는 타입만 가져온다.
 *
 * 결은 2D 에셋과 같아야 한다(AGENTS.md 「three.js 는 이렇게 쓴다」).
 *   - 정사영. 원근이 없다
 *   - 면은 밝은 면 · 그늘 면 두 톤뿐. 둘 다 CSS 토큰 색이다. 그라데이션 · 반사 · 번짐 없음
 *   - 굵은 남색 외곽선. 에셋의 외곽선과 같은 색이다
 *   - 캐릭터는 입체로 만들지 않는다. 2D 캐릭터를 종이 인형처럼 세운다
 *
 * 나무는 줄지 않는다. 쉰 날에 시든 나무를 그리면 벌이 된다.
 *
 * **섬은 제자리에 있다.** 둥실 떠다니지 않고(9/23 「호버링은 제거」), 구름 · 나무 · 풍차도 멈춰 있다.
 * 움직이는 건 손으로 돌릴 때, 누르면 캐릭터가 뛸 때, 나무가 자라고 장식이 튀어나오는 순간뿐이다.
 */
import type * as T from "three";

import type { DecorationId } from "@/lib/unlocks";

import {
  DECOR_CLEAR,
  DECOR_SPOTS,
  buildDecoration,
  decorationSpot,
  type Decoration,
} from "./decorations";
import { type Addons, type Palette, type Three, toonKit } from "./toon";

/** 섬의 치수와 카메라. 캐릭터가 설 자리를 three 없이도 셀 수 있게 밖에 둔다 */
export const ISLAND = {
  /** 육각형 꼭짓점까지 */
  radius: 2.5,
  /** 윗판(파란 띠) 두께 */
  slab: 0.42,
  /** 아래로 좁아지는 받침 높이 */
  base: 1.9,
  /** 카메라 높이각. 30도면 윗면이 넉넉히 보인다 */
  elevation: (30 * Math.PI) / 180,
  azimuth: Math.PI / 4,
  /** 카메라가 보는 높이. 섬 윗면이 0 이다 */
  target: 0.1,
  /** 정사영 반높이(세계 단위). 캔버스 높이가 이만큼의 두 배를 담는다 */
  view: 3,
  /** 캐릭터 키가 캔버스 높이의 몇 배인가 */
  mascot: 0.42,
  /** 그림 아래에서 발까지. 키움이 그림은 160 칸 중 151 칸째에 발이 닿는다 */
  feet: 9 / 160,
} as const;

/** 나무가 설 수 있는 자리 수. 이보다 많이 운동하면 나무가 조금씩 커진다 */
export const MAX_PLANTS = 28;

/**
 * 캐릭터 발이 캔버스 위에서 몇 % 아래에 서는가.
 * 세로축 위의 점 (0, y, 0) 은 화면에서 (y − target)·cos(높이각) 만큼 가운데보다 위에 선다.
 */
export function footRatio() {
  const up = (0 - ISLAND.target) * Math.cos(ISLAND.elevation);
  return 0.5 - up / (2 * ISLAND.view);
}

/* ─── 흔들리지 않는 난수 ───────────────────────────────────────
   같은 아이에게는 늘 같은 자리. 새로고침할 때마다 나무가 옮겨 다니면
   자기 섬이 아니라 그림으로 보인다. */

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 육각형 안인가. 꼭짓점이 +z 쪽을 향한 육각형(three 의 CylinderGeometry 6각) */
function insideHex(x: number, z: number, radius: number) {
  const inner = radius * Math.cos(Math.PI / 6);
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    if (x * Math.sin(a) + z * Math.cos(a) > inner) return false;
  }
  return true;
}

type Kind = "tree" | "pine" | "bush";

/** 카메라 반대편. 섬을 돌리기 전, 캐릭터 바로 뒤 */
const BEHIND = ISLAND.azimuth + Math.PI;

interface Slot {
  x: number;
  z: number;
  kind: Kind;
  size: number;
  yellow: boolean;
  phase: number;
}

/** 장식 자리 — 레벨과 상관없이 늘 비워 둔다. 장식이 열릴 때 나무가 옮겨 다니지 않게 */
const DECOR_AT = (Object.keys(DECOR_SPOTS) as DecorationId[]).map((id) =>
  decorationSpot(id, ISLAND.azimuth),
);

/**
 * 나무 자리. 캐릭터 가까이는 비워 둔다 — 캐릭터 앞을 큰 나무가 가리면
 * 아이가 자기 캐릭터를 못 찾는다. 가까운 자리에는 낮은 덤불만 선다.
 */
function slotsFor(seed: string): Slot[] {
  const rand = random(seed);
  const out: Slot[] = [];
  for (let tries = 0; out.length < MAX_PLANTS && tries < 6000; tries++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * ISLAND.radius;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (!insideHex(x, z, ISLAND.radius - 0.42)) continue;
    // 큰 나무는 가장자리에만. 캐릭터 앞에 서도 발끝까지만 닿는다
    const far = r >= 1.55;
    if (r < 1 || (!far && r > 1.42)) continue;
    const kind: Kind = far ? (rand() < 0.3 ? "pine" : "tree") : "bush";
    // 처음 보는 방향에서 캐릭터 바로 뒤에는 나무를 두지 않는다 — 머리 위로 삐져나와
    // 뿔이나 모자처럼 보인다. 섬을 돌리면 잠깐 지나갈 뿐이다
    if (kind !== "bush" && Math.abs(Math.atan2(Math.sin(a - BEHIND), Math.cos(a - BEHIND))) < 0.55)
      continue;
    if (DECOR_AT.some((d) => Math.hypot(d.x - x, d.z - z) < DECOR_CLEAR)) continue;
    const gap = kind === "bush" ? 0.52 : 0.7;
    if (
      out.some((p) => Math.hypot(p.x - x, p.z - z) < Math.max(gap, p.kind === "bush" ? 0.52 : 0.7))
    )
      continue;
    out.push({
      x,
      z,
      kind,
      size: 0.86 + rand() * 0.26,
      yellow: rand() < 0.62,
      phase: rand() * Math.PI * 2,
    });
  }
  return out;
}

/** 튀어 오르듯 — 한 번 크게 넘쳤다가 출렁이며 제자리 */
function popOut(k: number) {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return Math.pow(2, -9 * k) * Math.sin((k * 8 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

export interface Island {
  /** 돌아가는 섬. 나무가 여기에 붙는다 */
  root: T.Group;
  /** 섬 아래 구름. 섬과 같이 돌지 않는다 */
  clouds: T.Group;
  /** 가운데 선 캐릭터. 섬과 같이 돌지 않는다 — 늘 이쪽을 본다 */
  figure: T.Group;
  /** 캔버스 크기가 바뀌면 부른다 — 외곽선 굵기를 픽셀로 맞춘다 */
  resize(width: number, height: number): void;
  /** 매 장면. t 는 초 */
  update(t: number): void;
  /** 아직 움직이는 중인가(뛰기 · 자라기 · 튀어나오기). 아니면 그리기를 쉰다 */
  busy(): boolean;
  /** 캐릭터가 한 번 뛴다 */
  hop(t: number): void;
  /** 가장 최근 나무가 자라난다(다 했어요 순간) */
  sprout(t: number): void;
  /** 방금 열린 장식이 튀어나온다(레벨 업 순간). 나무가 자란 뒤에 */
  reveal(t: number): void;
  /** 나무를 몇 그루 세웠나 */
  plants: number;
  /** 가장 최근 나무가 섬 위 어느 방향에 있나(라디안). 없으면 null */
  newest: number | null;
  dispose(): void;
}

type PartKind =
  "trunk" | "crownYellow" | "crownBlue" | "pine" | "stem" | "bloomYellow" | "bloomWhite";

export function buildIsland(
  THREE: Three,
  addons: Addons,
  {
    plants,
    seed,
    decorations = [],
    unveil = null,
    palette,
    mascot,
    light,
    toward,
  }: {
    plants: number;
    seed: string;
    /** 섬에 세울 장식 — 이 레벨까지 열린 것 */
    decorations?: DecorationId[];
    /** 방금 열린 장식. `reveal` 전까지 숨어 있다 */
    unveil?: DecorationId | null;
    palette: Palette;
    /** 캐릭터 그림. 없으면 섬만 */
    mascot: HTMLImageElement | null;
    /** 세계 좌표의 빛 방향. 카메라에서 셈해 넘긴다 */
    light: T.Vector3;
    /** 섬 가운데에서 카메라 쪽을 가리키는 단위 벡터 */
    toward: T.Vector3;
  },
): Island {
  const kit = toonKit(THREE, addons, palette, light);
  const { keep, toon, hullThin, hullGeometry, solid } = kit;

  const root = new THREE.Group();
  const island = new THREE.Group();
  root.add(island);

  /* 윗판 — 흰 윗면과 파란 띠. CylinderGeometry 의 묶음은 옆면 · 윗면 · 아랫면 차례다 */
  const slabGeometry = new THREE.CylinderGeometry(ISLAND.radius, ISLAND.radius, ISLAND.slab, 6);
  slabGeometry.translate(0, -ISLAND.slab / 2, 0);
  island.add(
    solid(slabGeometry, [
      toon(palette.band, palette.bandShade, true),
      toon(palette.top, palette.topShade, true),
      toon(palette.band, palette.bandShade, true),
    ]),
  );

  /* 받침 — 아래로 좁아진다. 떠 있는 섬으로 읽힌다 */
  const baseGeometry = new THREE.CylinderGeometry(
    ISLAND.radius * 0.96,
    ISLAND.radius * 0.36,
    ISLAND.base,
    6,
  );
  baseGeometry.translate(0, -ISLAND.slab - ISLAND.base / 2, 0);
  island.add(solid(baseGeometry, toon(palette.base, palette.baseShade, true, -0.3)));

  /* 모서리 선 — 윗판과 받침을 한 번에 */
  const edges = [slabGeometry, baseGeometry].map((g) => keep(new THREE.EdgesGeometry(g, 25)));
  const edgePositions = edges.flatMap((e) => Array.from(e.getAttribute("position").array));
  const edgeGeometry = keep(new addons.LineSegmentsGeometry().setPositions(edgePositions));
  const edgeMaterial = keep(
    new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
  );
  island.add(new addons.LineSegments2(edgeGeometry, edgeMaterial));

  /* 나무와 꽃 */
  const slots = slotsFor(seed);
  const shown = Math.min(plants, slots.length);
  // 자리를 다 채운 뒤로는 나무가 조금씩 커진다. 줄지는 않는다
  const extra = plants > slots.length ? Math.min(0.25, (plants - slots.length) * 0.01) : 0;

  const trunkGeometry = keep(new THREE.CylinderGeometry(0.06, 0.085, 0.5, 8));
  trunkGeometry.translate(0, 0.25, 0);
  const crownGeometry = keep(new THREE.SphereGeometry(0.32, 22, 16));
  const pineGeometry = keep(new THREE.ConeGeometry(0.3, 0.78, 18));
  const stemGeometry = keep(new THREE.CylinderGeometry(0.022, 0.028, 0.3, 6));
  stemGeometry.translate(0, 0.15, 0);
  const bloomGeometry = keep(new THREE.SphereGeometry(0.11, 16, 12));

  const navy = toon(palette.line, palette.line);
  const white = toon(palette.white, palette.whiteShade);
  const yellow = toon(palette.yellow, palette.yellowShade);
  const blue = toon(palette.blue, palette.blueShade);

  const PARTS: Record<PartKind, [T.BufferGeometry, T.ShaderMaterial]> = {
    trunk: [trunkGeometry, navy],
    crownYellow: [crownGeometry, yellow],
    crownBlue: [crownGeometry, blue],
    pine: [pineGeometry, blue],
    stem: [stemGeometry, navy],
    bloomYellow: [bloomGeometry, yellow],
    bloomWhite: [bloomGeometry, white],
  };

  interface Piece {
    plant: number;
    kind: PartKind;
    local: T.Matrix4;
    slot: number;
  }
  const pieces: Piece[] = [];
  const counts: Record<PartKind, number> = {
    trunk: 0,
    crownYellow: 0,
    crownBlue: 0,
    pine: 0,
    stem: 0,
    bloomYellow: 0,
    bloomWhite: 0,
  };
  const at = (x: number, y: number, z: number, sy = 1) =>
    new THREE.Matrix4().makeScale(1, sy, 1).setPosition(x, y, z);
  const piece = (plant: number, kind: PartKind, local: T.Matrix4) =>
    pieces.push({ plant, kind, local, slot: counts[kind]++ });

  for (let i = 0; i < shown; i++) {
    const s = slots[i];
    if (s.kind === "tree") {
      piece(i, "trunk", at(0, 0, 0));
      piece(i, s.yellow ? "crownYellow" : "crownBlue", at(0, 0.62, 0));
    } else if (s.kind === "pine") {
      piece(i, "trunk", at(0, 0, 0, 0.5));
      piece(i, "pine", at(0, 0.58, 0));
    } else {
      // 꽃 두 송이 — 캐릭터 가까이는 낮은 것만
      for (const [dx, dz, h] of [
        [0, 0, 1],
        [0.17, 0.08, 0.72],
      ] as const) {
        piece(i, "stem", at(dx, 0, dz, h));
        piece(i, s.yellow ? "bloomYellow" : "bloomWhite", at(dx, 0.3 * h + 0.06, dz));
      }
    }
  }

  /** 모양 하나에 면 한 벌 · 외곽선 한 벌. 둘이 같은 자리 목록을 나눠 쓴다 */
  const instanced = new Map<PartKind, T.InstancedMesh>();
  for (const kind of Object.keys(PARTS) as PartKind[]) {
    if (counts[kind] === 0) continue;
    const [geometry, material] = PARTS[kind];
    const fill = new THREE.InstancedMesh(geometry, material, counts[kind]);
    fill.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    fill.frustumCulled = false;
    const outline = new THREE.InstancedMesh(hullGeometry(geometry), hullThin, counts[kind]);
    outline.instanceMatrix = fill.instanceMatrix;
    outline.frustumCulled = false;
    island.add(fill, outline);
    instanced.set(kind, fill);
    keep(fill);
    keep(outline);
  }

  /* 장식 — 섬과 같이 돈다 */
  const decor: { id: DecorationId; piece: Decoration; shownAt: number | null }[] = decorations.map(
    (id) => {
      const piece = buildDecoration(THREE, kit, palette, id);
      const { x, z, a } = decorationSpot(id, ISLAND.azimuth);
      piece.group.position.set(x, 0, z);
      // 울타리는 가장자리를 따라, 나머지는 섬 앞(처음 보는 쪽)을 본다
      piece.group.rotation.y = id === "fence" ? a : ISLAND.azimuth;
      island.add(piece.group);
      const hidden = id === unveil;
      if (hidden) piece.group.scale.setScalar(0.0001);
      return { id, piece, shownAt: hidden ? Infinity : null };
    },
  );

  const plantState = slots.slice(0, shown).map((s) => ({
    x: s.x,
    z: s.z,
    phase: s.phase,
    size: s.size * (1 + extra),
    grownAt: null as number | null,
  }));
  const plantMatrix = plantState.map(() => new THREE.Matrix4());
  const euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const scratch = new THREE.Matrix4();

  /** 나무 자리를 다시 셈한다. 흔들림 · 자라남이 없으면 한 번이면 된다 */
  let plantsDirty = true;
  const placePlants = (t: number) => {
    plantState.forEach((p, i) => {
      let grow = 1;
      if (p.grownAt !== null) {
        const k = (t - p.grownAt) / 0.9;
        grow = Math.max(0.0001, popOut(k));
        if (k >= 1) p.grownAt = null;
      }
      euler.set(0, p.phase, 0);
      quaternion.setFromEuler(euler);
      position.set(p.x, 0, p.z);
      scale.setScalar(p.size * grow);
      plantMatrix[i].compose(position, quaternion, scale);
    });
    for (const p of pieces) {
      scratch.multiplyMatrices(plantMatrix[p.plant], p.local);
      instanced.get(p.kind)?.setMatrixAt(p.slot, scratch);
    }
    for (const mesh of instanced.values()) mesh.instanceMatrix.needsUpdate = true;
  };

  /*
    캐릭터 — 2D 그림을 세운다. 늘 이쪽을 본다.
    그림은 화면과 나란한 판이라 발끝이 섬 윗면에 파묻힌다. 카메라 쪽으로 살짝 당겨
    세운다 — 정사영이라 화면 위 자리는 그대로이고 깊이만 앞으로 온다.
  */
  const figure = new THREE.Group();
  figure.position.copy(toward).multiplyScalar(0.32);
  let sprite: T.Sprite | null = null;
  if (mascot) {
    const texture = keep(new THREE.Texture(mascot));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    const material = keep(
      new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.35 }),
    );
    sprite = new THREE.Sprite(material);
    sprite.center.set(0.5, ISLAND.feet);
    const tall = ISLAND.mascot * 2 * ISLAND.view;
    sprite.scale.set(tall, tall, 1);
    figure.add(sprite);
  }

  /* 구름 — 섬 아래에 둘. 섬과 같이 돌지 않는다. 화면 기준으로 둔다 */
  const right = new THREE.Vector3(0, 1, 0).cross(toward).normalize();
  const upward = toward.clone().cross(right);
  const onScreen = (x: number, y: number, depth: number) =>
    new THREE.Vector3(0, ISLAND.target, 0)
      .addScaledVector(right, x)
      .addScaledVector(upward, y)
      .addScaledVector(toward, depth);
  // 받침 왼쪽 앞에 하나, 오른쪽 뒤에 하나 — 섬이 구름 위에 떠 있다
  const cloudSpots = [
    { spot: onScreen(-1.45, -2.2, 2.2), size: 1 },
    { spot: onScreen(2.05, -1.55, -2.2), size: 0.85 },
  ];
  const PUFFS: [number, number, number, number][] = [
    [0, 0, 0, 1],
    [0.34, -0.05, 0.02, 0.78],
    [-0.33, -0.07, 0.03, 0.72],
  ];
  const puff = keep(new THREE.SphereGeometry(0.3, 20, 14));
  const puffCount = cloudSpots.length * PUFFS.length;
  const puffs = new THREE.InstancedMesh(puff, white, puffCount);
  puffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  puffs.frustumCulled = false;
  const puffOutline = new THREE.InstancedMesh(hullGeometry(puff), hullThin, puffCount);
  puffOutline.instanceMatrix = puffs.instanceMatrix;
  puffOutline.frustumCulled = false;
  keep(puffs);
  keep(puffOutline);
  const clouds = new THREE.Group();
  clouds.add(puffs, puffOutline);
  const noTurn = new THREE.Quaternion();
  // 구름도 제자리 — 떠다니는 것은 이 섬에 없다. 한 번 놓으면 끝
  const placeClouds = () => {
    cloudSpots.forEach((c, i) => {
      PUFFS.forEach(([bx, by, bz, bs], j) => {
        position.copy(c.spot);
        position.x += bx * c.size;
        position.y += by * c.size;
        position.z += bz * c.size;
        scale.set(bs * c.size, bs * 0.82 * c.size, bs * c.size);
        scratch.compose(position, noTurn, scale);
        puffs.setMatrixAt(i * PUFFS.length + j, scratch);
      });
    });
    puffs.instanceMatrix.needsUpdate = true;
  };

  let hopAt: number | null = null;
  const HOP = 0.5;

  /* 새 나무가 자랄 때 바닥에 번지는 고리 */
  const ringGeometry = keep(new THREE.RingGeometry(0.34, 0.42, 40));
  ringGeometry.rotateX(-Math.PI / 2);
  const ringMaterial = keep(
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.line),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.visible = false;
  island.add(ring);
  let ringAt: number | null = null;
  const newestSlot = shown > 0 ? slots[shown - 1] : null;

  let cloudsPlaced = false;

  return {
    root,
    clouds,
    figure,
    plants: shown,
    newest: newestSlot ? Math.atan2(newestSlot.x, newestSlot.z) : null,
    resize(width, height) {
      const perUnit = height / (2 * ISLAND.view);
      kit.setPixelsPerUnit(perUnit);
      edgeMaterial.resolution.set(width, height);
    },
    update(t) {
      if (sprite) {
        let jump = 0;
        if (hopAt !== null) {
          const k = (t - hopAt) / HOP;
          if (k >= 1) hopAt = null;
          else if (k > 0) jump = Math.sin(k * Math.PI) * 0.55;
        }
        sprite.position.y = jump;
      }
      for (const d of decor) {
        if (d.shownAt === null || d.shownAt === Infinity) continue;
        const k = (t - d.shownAt) / 0.9;
        d.piece.group.scale.setScalar(Math.max(0.0001, popOut(k)));
        if (k >= 1) d.shownAt = null;
      }
      const growing = plantState.some((p) => p.grownAt !== null);
      if (growing || plantsDirty) {
        placePlants(t);
        plantsDirty = false;
      }
      if (!cloudsPlaced) {
        placeClouds();
        cloudsPlaced = true;
      }
      if (ringAt !== null) {
        const k = (t - ringAt) / 0.8;
        ring.visible = k >= 0 && k < 1;
        if (k >= 1) ringAt = null;
        else if (k >= 0) {
          ring.scale.setScalar(1 + k * 2.6);
          ringMaterial.opacity = 1 - k;
        }
      }
    },
    busy() {
      return (
        hopAt !== null ||
        ringAt !== null ||
        plantState.some((p) => p.grownAt !== null) ||
        // 튀어나오기를 기다리는(∞) 장식은 아직 움직이지 않는다
        decor.some((d) => d.shownAt !== null && d.shownAt !== Infinity)
      );
    },
    hop(t) {
      if (hopAt === null) hopAt = t;
    },
    sprout(t) {
      const last = plantState[plantState.length - 1];
      if (!last || !newestSlot) return;
      // 섬이 새 나무 쪽으로 돌아선 뒤에 자란다. 캐릭터도 같이 뛴다
      const start = t + 0.75;
      last.grownAt = start;
      plantsDirty = true;
      ring.position.set(newestSlot.x, 0.02, newestSlot.z);
      ringAt = start;
      hopAt = start + 0.1;
    },
    reveal(t) {
      const d = decor.find((x) => x.id === unveil);
      if (!d) return;
      // 나무가 다 자란 다음 — 한 번에 하나씩 눈에 들어오게
      d.shownAt = t + 1.5;
      hopAt = t + 1.6;
    },
    dispose() {
      kit.dispose();
    },
  };
}
