"use client";

import { useRef, useState } from "react";
import type * as T from "three";

import { FactorIcon } from "@/components/domain/factor-icon";
import type { RadarPoint } from "@/lib/api/types";
import { FACTORS, toHexagon } from "@/lib/fitness-factors";
import { projectOrtho, separateLabels, type OrthoSpec, type Vec3 } from "@/lib/ortho";
import { cn } from "@/lib/utils";

import type { Three } from "./toon";
import { useToonScene } from "./use-toon-scene";
import { useWidth } from "./use-width";

/**
 * 또래 바다 — 부모 화면의 여섯 요인을 물 위로 솟는 기둥으로.
 *
 * 섬 위 웅덩이에 물이 **또래 평균 50** 높이까지 차 있다. 평균보다 높은 힘은 물 위로 솟고,
 * 낮은 힘은 물 아래에서 비쳐 보인다. 물 위 남색 고리가 그 기둥의 50 자리다 —
 * 물 아래 기둥은 꼭대기와 고리 사이가 비어 보여 얼마나 모자란지 보인다.
 *
 * 값을 속이지 않는다:
 *   - 정사영 · 한 판 위 · 높이는 백분위에 곧게 비례. 물은 비치므로 물 아래 기둥도 다 보인다
 *   - 한 줄로 세운다 — 앞 기둥이 뒤 기둥을 가리지 않는다(육각 판 꼭지점에 세웠을 때의 문제)
 *   - 안 잰 요인은 기둥 없이 납작한 판과 이름만 — 0 으로 그리면 꼴찌처럼 보인다
 *   - 숫자는 글자로 얹는다. 차례는 평면 육각형 · 요인 표와 같다
 *
 * **부모 화면에만** 둔다 — 물 아래 기둥이 곧 「약한 항목」 이라서(규칙 10).
 */
const SPEC: OrthoSpec = { elevation: 28, azimuth: -14, target: 0.5, view: 2.44 };
const GAP = 1;
const RADIUS = 0.34;
/** 100 일 때 기둥 높이(세계 단위) */
const TALL = 2.4;
/** 또래 평균 50 — 물 높이 */
const WATER = TALL / 2;
/** 길쭉한 육각 한 둘레 — `half` 뾰족한 끝, `flat` 곧은 변이 끝나는 곳, `depth` 앞뒤 반폭 */
interface Ring {
  half: number;
  flat: number;
  depth: number;
}
const SLAB: Ring = { half: 3.05, flat: 2.72, depth: 0.84 };
const SLAB_THICK = 0.3;
/** 섬 밑동 — 아래로 좁아진다 */
const UNDER: Ring = { half: 2.45, flat: 2.2, depth: 0.4 };
const UNDER_DROP = 0.55;
/** 물 — 판 안쪽으로 들여 흰 테가 남게 */
const POOL: Ring = { half: 2.88, flat: 2.6, depth: 0.7 };
/** 이 폭일 때 이 높이다. 좁은 폰에서는 비율 그대로 줄어든다 */
const REF_WIDTH = 320;
/** 맨 아래 한 줄은 요인 그림 · 이름 자리다 */
const REF_HEIGHT = 255;

const spotX = (i: number) => (i - (FACTORS.length - 1) / 2) * GAP;
/** 안 잰 요인은 납작한 판 — 0 기둥이 아니다 */
const heightOf = (v: number | null) => (v == null ? 0.05 : Math.max(0.06, (v / 100) * TALL));

/** 둘레의 여섯 꼭지점(바닥에서 본 차례). 왼쪽 끝부터 앞 → 오른쪽 → 뒤 */
function corners({ half, flat, depth }: Ring): [number, number][] {
  return [
    [-half, 0],
    [-flat, depth],
    [flat, depth],
    [half, 0],
    [flat, -depth],
    [-flat, -depth],
  ];
}

/**
 * 길쭉한 육각 기둥. 위 · 아래 둘레를 따로 받아 섬 밑동처럼 좁아지게도 짓는다.
 * 육각 원기둥을 짓고 꼭지점을 옮긴다 — 면의 앞뒤(감기는 방향)가 그대로 맞는다.
 */
function longHex(THREE: Three, top: Ring, bottom: Ring, height: number) {
  const g = new THREE.CylinderGeometry(1, 1, height, 6, 1, false, Math.PI / 6);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const ring = p.getY(i) > 0 ? top : bottom;
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setXYZ(
      i,
      Math.abs(x) < 1e-6 ? 0 : Math.sign(x) * (Math.abs(x) > 0.75 ? ring.half : ring.flat),
      p.getY(i),
      Math.abs(z) < 0.1 ? 0 : Math.sign(z) * ring.depth,
    );
  }
  // 면마다 법선을 따로 — 두 톤이 면 단위로 갈린다
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  return flat;
}

export function FactorSea({
  points,
  name,
  className,
}: {
  /** 범례에 쓰는 아이 이름 */
  name: string;
  /** 서버가 준 요인 점수 그대로 — 여섯 요인으로 맞추는 것은 여기서 한다 */
  points: RadarPoint[] | null | undefined;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  /** 입체가 섰다 — 그 전 · WebGL 이 없을 때는 같은 자리에 평면 그림이 선다 */
  const [ready, setReady] = useState(false);
  const hex = toHexagon(points);
  const values = FACTORS.map((f) => {
    const p = hex.find((x) => x.factor === f)?.percentile;
    return p == null ? null : Math.max(0, Math.min(100, p));
  });
  const key = values.join();

  useToonScene(
    host,
    SPEC,
    ({ THREE, addons, kit, palette, scene, still, seen }) => {
      const { keep, toon, solid } = kit;
      const root = new THREE.Group();
      scene.add(root);
      const lineMaterials: InstanceType<typeof addons.LineMaterial>[] = [];
      const line = (width: number) => {
        const material = keep(
          new addons.LineMaterial({
            color: new THREE.Color(palette.line).getHex(),
            linewidth: width,
          }),
        );
        lineMaterials.push(material);
        return material;
      };
      const navy = line(2);
      const segments = (positions: number[], material: typeof navy) =>
        new addons.LineSegments2(
          keep(new addons.LineSegmentsGeometry().setPositions(positions)),
          material,
        );
      const edgesOf = (g: T.BufferGeometry) =>
        Array.from(keep(new THREE.EdgesGeometry(g, 25)).getAttribute("position").array);

      /* 섬 — 흰 윗면 · 파란 띠 · 좁아지는 밑동. 키움 섬과 같은 결 */
      const slab = keep(longHex(THREE, SLAB, SLAB, SLAB_THICK));
      slab.translate(0, -SLAB_THICK / 2, 0);
      const band = toon(palette.band, palette.bandShade, true);
      root.add(solid(slab, [band, toon(palette.top, palette.topShade, true), band]));
      const under = keep(longHex(THREE, SLAB, UNDER, UNDER_DROP));
      under.translate(0, -SLAB_THICK - UNDER_DROP / 2, 0);
      root.add(solid(under, toon(palette.base, palette.baseShade, true, -0.3)));
      root.add(segments([...edgesOf(slab), ...edgesOf(under)], navy));

      /* 기둥 */
      const prism = keep(new THREE.CylinderGeometry(RADIUS, RADIUS, 1, 6));
      prism.translate(0, 0.5, 0);
      const prismLines = keep(new addons.LineSegmentsGeometry().setPositions(edgesOf(prism)));
      const top = toon(palette.white, palette.whiteShade, true, -1);
      const blue = toon(palette.blue, palette.blueShade, true);
      const rest = toon(palette.base, palette.baseShade, true, -1);
      const pillars = values.map((v, i) => {
        const group = new THREE.Group();
        group.position.set(spotX(i), 0, 0);
        group.add(solid(prism, v == null ? [rest, rest, rest] : [blue, top, blue]));
        group.add(new addons.LineSegments2(prismLines, navy));
        const height = heightOf(v);
        group.scale.y = height;
        root.add(group);
        return { group, height };
      });

      /* 물 — 비치는 파랑. 깊이를 쓰지 않아 물 아래 기둥이 비쳐 보인다. 기둥보다 늦게 그린다 */
      const water = keep(longHex(THREE, POOL, POOL, WATER));
      water.translate(0, WATER / 2, 0);
      const glass = (opacity: number) =>
        keep(
          new THREE.MeshBasicMaterial({
            color: palette.baseShade,
            transparent: true,
            opacity,
            depthWrite: false,
          }),
        );
      const pool = new THREE.Mesh(water, [glass(0.72), glass(0.55), glass(0)]);
      pool.renderOrder = 2;
      root.add(pool);
      // 앞면 흰 빛줄 둘 — 얼음땡 얼음과 같은 결. 물이 유리처럼 비친다는 표시
      const shine = keep(new THREE.PlaneGeometry(0.07, 0.7));
      const shineMaterial = keep(
        new THREE.MeshBasicMaterial({ color: palette.white, transparent: true, opacity: 0.9 }),
      );
      for (const [x, y, k] of [
        [-2.3, 0.62, 1],
        [-2.13, 0.7, 0.6],
      ] as const) {
        const streak = new THREE.Mesh(shine, shineMaterial);
        streak.position.set(x, y, POOL.depth + 0.01);
        streak.scale.set(k, k, 1);
        streak.rotation.z = -0.35;
        streak.renderOrder = 3;
        root.add(streak);
      }

      /* 물높이 선(또래 평균) — 물 둘레만. 세로 모서리 선은 끝 기둥 앞을 가로질러 긋지 않는다 */
      const shore = corners(POOL);
      const lift = WATER + 0.01;
      const rim: number[] = [];
      shore.forEach(([x, z], k) => {
        const [nx, nz] = shore[(k + 1) % shore.length];
        rim.push(x, lift, z, nx, lift, nz);
      });
      root.add(segments(rim, line(2.5)));

      /* 고리 — 기둥마다 물 위에 그 기둥의 50 자리. 안 잰 요인에는 두지 않는다 */
      const collar: number[] = [];
      values.forEach((v, i) => {
        if (v == null) return;
        const r = RADIUS + 0.1;
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const b = ((k + 1) * Math.PI) / 3;
          collar.push(spotX(i) + Math.sin(a) * r, lift, Math.cos(a) * r);
          collar.push(spotX(i) + Math.sin(b) * r, lift, Math.cos(b) * r);
        }
      });
      if (collar.length) root.add(segments(collar, line(2)));

      // 마지막 기둥까지 다 솟는 데 걸리는 시간
      const growFor = (pillars.length - 1) * 0.07 + 0.7;
      return {
        busy: () => seen() < growFor,
        update() {
          if (still) return;
          // 보이는 순간 왼쪽부터 차례로 솟는다 — 물을 뚫고 올라오는 것이 보인다
          const k = seen();
          for (const [i, p] of pillars.entries()) {
            const local = Math.min(1, Math.max(0, (k - i * 0.07) / 0.7));
            const ease = 1 - Math.pow(1 - local, 3);
            p.group.scale.y = Math.max(0.001, p.height * ease);
          }
        },
        resize(width, heightPx) {
          for (const m of lineMaterials) m.resolution.set(width, heightPx);
        },
      };
    },
    [key],
    () => setReady(true),
  );

  const width = useWidth(host, REF_WIDTH);
  const tall = (width * REF_HEIGHT) / REF_WIDTH;
  const { tops, axis } = placeLabels(values, width, tall);
  return (
    <>
      <div
        ref={host}
        role="img"
        aria-label={
          FACTORS.map((f, i) => `${f} ${values[i] == null ? "아직 안 쟀어요" : values[i]}`).join(
            ", ",
          ) + ". 물 높이가 또래 평균 50"
        }
        className={cn("relative w-full touch-pan-y select-none", className)}
        style={{ aspectRatio: `${REF_WIDTH} / ${REF_HEIGHT}` }}
      >
        {/* 입체가 오기 전 · 없을 때 — 같은 셈으로 같은 자리에 평면 그림 */}
        <FlatSea
          values={values}
          width={width}
          height={tall}
          className={cn("transition-opacity duration-500", ready && "opacity-0")}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {/* 기둥 위 값 */}
          {tops.map(({ factor, value, x, y }) => (
            <span
              key={factor}
              className="bg-paper/85 absolute -translate-x-1/2 -translate-y-full rounded-md px-1 leading-tight whitespace-nowrap"
              style={{ left: x, top: y }}
            >
              {value == null ? (
                <span className="text-micro text-ink-soft font-bold">안 잼</span>
              ) : (
                <span className="text-ink text-sm font-extrabold tabular-nums">{value}</span>
              )}
            </span>
          ))}
          {/* 섬 아래 한 줄 — 요인 그림과 이름. 기둥 가운데에 맞춘다 */}
          {axis.map(({ factor, x }) => (
            <span
              key={factor}
              className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-0.5"
              style={{ left: x }}
            >
              <FactorIcon factor={factor} className="size-5" />
              <span className="text-micro text-ink-soft font-bold whitespace-nowrap">{factor}</span>
            </span>
          ))}
        </div>
      </div>
      {/* 범례 — 색만으로 가르지 않는다. 기둥과 물이 무엇인지 글로 */}
      <p className="text-caption text-ink-soft flex items-center justify-center gap-3 font-semibold">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="bg-signal inline-block h-3 w-2 rounded-[3px]" />
          {name}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="bg-signal-pale border-signal-deep inline-block h-2.5 w-3.5 rounded-[2px] border-t-2"
          />
          물 높이 = 또래 평균 50
        </span>
      </p>
    </>
  );
}

/**
 * 입체와 같은 셈으로 그린 평면 한 장 — 기둥 · 물 · 물높이 선. three 가 오기 전에 먼저 서고,
 * WebGL 이 없으면 이대로 남는다. 빈 칸이 먼저 뜨지 않게.
 */
function FlatSea({
  values,
  width,
  height,
  className,
}: {
  values: (number | null)[];
  width: number;
  height: number;
  className?: string;
}) {
  const at = (p: Vec3) => projectOrtho(SPEC, p, width, height);
  const poly = (ring: Ring, y: number) =>
    corners(ring)
      .map(([x, z]) => at([x, y, z]))
      .map(({ x, y: sy }) => `${x.toFixed(1)},${sy.toFixed(1)}`)
      .join(" ");
  const perUnit = height / (2 * SPEC.view);
  const barWidth = RADIUS * 1.7 * perUnit;
  const shape = (points: { x: number; y: number }[]) =>
    hull(points)
      .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
  const ringAt = (ring: Ring, y: number) => corners(ring).map(([x, z]) => at([x, y, z]));
  // 섬 밑동 · 띠 · 물의 겉모습 — 위 둘레와 아래 둘레를 이은 볼록 껍질
  const under = shape([...ringAt(SLAB, -SLAB_THICK), ...ringAt(UNDER, -SLAB_THICK - UNDER_DROP)]);
  const band = shape([...ringAt(SLAB, 0), ...ringAt(SLAB, -SLAB_THICK)]);
  const water = shape([...ringAt(POOL, 0), ...ringAt(POOL, WATER)]);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <g className="stroke-signal-deep" strokeWidth={2} strokeLinejoin="round">
        <polygon points={under} className="fill-signal-soft" />
        <polygon points={band} className="fill-signal" />
        <polygon points={poly(SLAB, 0)} className="fill-paper" />
      </g>
      {values.map((v, i) => {
        const base = at([spotX(i), 0, 0]);
        const top = at([spotX(i), heightOf(v), 0]);
        return (
          <rect
            key={FACTORS[i]}
            x={base.x - barWidth / 2}
            y={top.y}
            width={barWidth}
            height={Math.max(2, base.y - top.y)}
            rx={3}
            className={v == null ? "fill-signal-pale" : "fill-signal"}
          />
        );
      })}
      <polygon points={water} className="fill-signal-pale" fillOpacity={0.72} />
      <polygon
        points={poly(POOL, WATER)}
        className="stroke-signal-deep fill-none"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 볼록 껍질(단조 사슬) — 평면 물 모양 */
function hull(points: { x: number; y: number }[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: typeof sorted) => {
    const out: typeof sorted = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * 글자 자리. 값은 기둥 꼭대기와 물높이 중 **높은 쪽 위**에 둔다 — 물 아래 기둥이면 값이
 * 물 위 고리 위에 서서, 꼭대기와 고리 사이 틈을 덮지 않는다. 겹치면 뒤쪽 글자를 올린다.
 * 이름은 섬 아래 한 줄 — 기둥 가운데와 같은 가로 자리다(정사영이라 높이와 상관없다).
 */
function placeLabels(values: (number | null)[], width: number, height: number) {
  const boxes = FACTORS.map((factor, i) => {
    const v = values[i];
    const top = Math.max(heightOf(v), WATER) + 0.06;
    const at = projectOrtho(SPEC, [spotX(i), top, 0], width, height);
    // 글자 폭 어림 — 숫자 한 자 8.5px + 좌우 여백 8px. 「안 잼」 은 30px
    const w = v == null ? 30 : 8 + String(v).length * 8.5;
    return { factor, value: v, x: at.x, y: at.y - 2, w, h: 20 };
  });
  const ys = separateLabels(boxes);
  return {
    tops: boxes.map((b, i) => ({ ...b, y: ys[i] })),
    axis: FACTORS.map((factor, i) => ({
      factor,
      x: projectOrtho(SPEC, [spotX(i), 0, 0], width, height).x,
    })),
  };
}
