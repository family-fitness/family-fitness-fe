"use client";

import { useRef } from "react";

import type { RadarPoint } from "@/lib/api/types";
import { FACTORS, toHexagon } from "@/lib/fitness-factors";
import { projectOrtho, separateLabels, type OrthoSpec } from "@/lib/ortho";
import { cn } from "@/lib/utils";

import { useToonScene } from "./use-toon-scene";

/**
 * 체력 육각 기둥 — 부모 화면의 여섯 요인을 섬 위 기둥으로.
 *
 * 육각형 그래프와 같은 것을 말한다: 여섯 꼭지점마다 기둥 하나, **높이가 또래 백분위**.
 *   - 기둥마다 50 높이에 남색 고리 — 또래 평균. 기둥이 고리를 지나면 평균보다 위,
 *     고리 아래에서 멈추면 그만큼 모자란 것이 고리와 기둥 사이 틈으로 보인다
 *   - 안 잰 요인은 기둥 없이 납작한 판과 이름만 — 0 으로 그리면 꼴찌처럼 보인다
 *   - 꼭지점 차례가 평면 육각형 그래프와 같다(심폐지구력이 맨 뒤). 조금 비껴 본다 —
 *     정면이면 앞뒤 기둥이 한 줄로 겹쳐 글자가 부딪힌다
 *
 * 정사영이라 뒤 기둥이 작아 보이지 않는다. 숫자는 글자로 얹는다. 표(요인별)가 늘 아래에 같이 있다.
 * **부모 화면에만** 둔다 — 안쪽으로 들어간 기둥이 곧 「약한 항목」 이라서(규칙 10).
 */
const SPEC: OrthoSpec = { elevation: 28, azimuth: 25, target: 0.75, view: 2.6 };
const RING = 1.6;
const PILLAR = 0.38;
const TALL = 2.1;

/** 여섯 꼭지점 — 심폐지구력이 맨 뒤(위)에서 시계 방향. 육각형 그래프와 같은 차례 */
function spot(i: number) {
  const a = Math.PI - (i * Math.PI) / 3;
  return { x: Math.sin(a) * RING, z: Math.cos(a) * RING };
}

export function FactorPillars({
  points,
  name,
  height = 280,
  className,
}: {
  /** 범례에 쓰는 아이 이름 */
  name: string;
  /** 서버가 준 요인 점수 그대로 — 여섯 요인으로 맞추는 것은 여기서 한다 */
  points: RadarPoint[] | null | undefined;
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
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
      const lines: InstanceType<typeof addons.LineMaterial>[] = [];
      const line = (width: number, color: string) => {
        const material = keep(
          new addons.LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: width }),
        );
        lines.push(material);
        return material;
      };
      const navyLine = line(2, palette.line);

      /* 받침 — 키움 섬과 같은 육각 판 */
      const slab = new THREE.CylinderGeometry(2.45, 2.45, 0.34, 6);
      slab.translate(0, -0.17, 0);
      const band = toon(palette.band, palette.bandShade, true);
      root.add(solid(slab, [band, toon(palette.top, palette.topShade, true), band]));
      const base = new THREE.CylinderGeometry(2.35, 0.9, 0.9, 6);
      base.translate(0, -0.34 - 0.45, 0);
      root.add(solid(base, toon(palette.base, palette.baseShade, true, -0.3)));
      root.add(
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().setPositions([
              ...Array.from(keep(new THREE.EdgesGeometry(slab, 25)).getAttribute("position").array),
              ...Array.from(keep(new THREE.EdgesGeometry(base, 25)).getAttribute("position").array),
            ]),
          ),
          navyLine,
        ),
      );

      /* 기둥 */
      const prism = keep(new THREE.CylinderGeometry(PILLAR, PILLAR, 1, 6));
      prism.translate(0, 0.5, 0);
      const prismLines = keep(
        new addons.LineSegmentsGeometry().fromEdgesGeometry(
          keep(new THREE.EdgesGeometry(prism, 25)),
        ),
      );
      const top = toon(palette.white, palette.whiteShade, true, -1);
      const blue = toon(palette.blue, palette.blueShade, true);
      const flat = toon(palette.base, palette.baseShade, true, -1);

      const spots = values.map((_, i) => spot(i));
      const pillars = values.map((v, i) => {
        const { x, z } = spots[i];
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        group.add(solid(prism, [v == null ? flat : blue, top, v == null ? flat : blue]));
        group.add(new addons.LineSegments2(prismLines, navyLine));
        const h = v == null ? 0.05 : Math.max(0.08, (v / 100) * TALL);
        group.scale.y = h;
        root.add(group);
        return { group, height: h };
      });

      /* 또래 평균 — 기둥마다 50 높이에 남색 테 하나(속이 빈 고리). 면으로 채우면 뚜껑처럼 보인다 */
      const collarLine = line(2.5, palette.line);
      const hexRing = (cx: number, cz: number, r: number, y: number) => {
        const out: number[] = [];
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const b = ((k + 1) * Math.PI) / 3;
          out.push(cx + Math.sin(a) * r, y, cz + Math.cos(a) * r);
          out.push(cx + Math.sin(b) * r, y, cz + Math.cos(b) * r);
        }
        return out;
      };
      // 안 잰 요인에는 테를 두지 않는다 — 빈 판 위에 뜬 테는 아무것도 말하지 않는다
      const collars = spots.flatMap(({ x, z }, i) =>
        values[i] == null ? [] : hexRing(x, z, PILLAR + 0.12, 0.5 * TALL),
      );
      root.add(
        new addons.LineSegments2(
          keep(new addons.LineSegmentsGeometry().setPositions(collars)),
          collarLine,
        ),
      );

      return {
        update() {
          if (still) return;
          // 보이는 순간 다 같이 솟는다
          const k = Math.min(1, Math.max(0, (seen() - 0.1) / 0.7));
          const ease = 1 - Math.pow(1 - k, 3);
          for (const p of pillars) p.group.scale.y = Math.max(0.001, p.height * ease);
        },
        resize(width, heightPx) {
          for (const m of lines) m.resolution.set(width, heightPx);
        },
      };
    },
    [key],
  );

  const width = 358;
  const labels = placeLabels(values, width, height);
  return (
    <>
      <div
        ref={host}
        role="img"
        aria-label={
          FACTORS.map((f, i) => `${f} ${values[i] == null ? "아직 안 쟀어요" : values[i]}`).join(
            ", ",
          ) + ". 기둥마다 남색 고리가 또래 평균 50"
        }
        className={cn("relative w-full select-none", className)}
        style={{ height }}
      >
        {/* 기둥마다 이름 · 값 한 장. 흰 바탕을 깔아 뒤 기둥 위에 겹쳐도 읽힌다 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {labels.map(({ factor, value, x, y }) => (
            <span
              key={factor}
              className="bg-paper/90 absolute -translate-x-1/2 -translate-y-full rounded-md px-1.5 py-px whitespace-nowrap shadow-sm"
              style={{ left: `calc(50% + ${x - width / 2}px)`, top: y }}
            >
              <span className="text-micro text-ink-soft font-bold">{factor}</span>
              {value != null && (
                <span className="text-ink ml-1 text-xs font-extrabold tabular-nums">{value}</span>
              )}
            </span>
          ))}
        </div>
      </div>
      {/* 범례 — 색만으로 가르지 않는다. 기둥과 테가 무엇인지 글로 */}
      <p className="text-caption text-ink-soft flex items-center justify-center gap-3 font-semibold">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="bg-signal inline-block h-3 w-2 rounded-[3px]" />
          {name}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="border-signal-deep inline-block size-3 rounded-full border-2"
          />
          또래 평균 50
        </span>
      </p>
    </>
  );
}

/**
 * 글자 자리. 기둥 꼭대기와 평균 고리 중 **높은 쪽 위**에 둔다 — 고리 아래에서 멈춘 기둥이면
 * 글자가 고리를 덮지 않아 모자란 틈이 그대로 보인다. 겹치면 뒤쪽 글자를 올린다.
 */
function placeLabels(values: (number | null)[], width: number, height: number) {
  const boxes = FACTORS.map((factor, i) => {
    const { x, z } = spot(i);
    const v = values[i];
    const top = v == null ? 0.05 : Math.max(0.08, (v / 100) * TALL, 0.5 * TALL + 0.08);
    const at = projectOrtho(SPEC, [x, top, z], width, height);
    // 글자 폭 어림 — 이름은 한글 한 자에 11px, 숫자는 7.5px, 좌우 여백 12px
    const w = 12 + factor.length * 11 + (v == null ? 0 : 4 + String(v).length * 7.5);
    return { factor, value: v, x: at.x, y: at.y - 3, w, h: 20 };
  });
  const ys = separateLabels(boxes);
  return boxes.map((b, i) => ({ ...b, y: ys[i] }));
}
