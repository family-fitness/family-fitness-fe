"use client";

import { useRef } from "react";
import type * as T from "three";

import type { DayLog } from "@/lib/api/types";
import { projectOrtho, type OrthoSpec } from "@/lib/ortho";
import { WEEKDAY } from "@/lib/today";
import { cn } from "@/lib/utils";

import { useToonScene } from "./use-toon-scene";
import { useWidth } from "./use-width";

/**
 * 이번 주 블록 탑 — 요일마다 육각 기둥 하나, 높이가 그날 움직인 분.
 *
 * 키움 섬과 같은 결(정사영 · 두 톤 · 남색 외곽선)이다. 재밌게 그리되 **값을 속이지 않는다**:
 *   - 정사영이라 앞뒤로 커 보이지 않고, 모든 기둥이 같은 판 위에서 선다
 *   - 높이는 분에 곧게 비례한다. 숫자를 기둥 위에 글자로 얹는다(DOM — 읽히고 번지지 않는다)
 *   - 쉰 날은 납작한 판 하나. 「빠진 날」 처럼 칠하지 않는다. 오늘은 노랑
 *
 * 글자는 three 없이 셈해서(`projectOrtho`) 먼저 선다. 기둥은 그 뒤에 자라난다.
 */
const SPEC: OrthoSpec = { elevation: 20, azimuth: 0, target: 0.95, view: 2.05 };
const GAP = 1.05;
const RADIUS = 0.4;
/** 가장 높은 기둥의 높이(세계 단위) */
const TALL = 2.3;
/** 이보다 적게 움직인 주에도 기둥이 너무 솟지 않게 — 30분을 한 칸 끝으로 둔다 */
const FLOOR_MINUTES = 30;
/** 이 폭일 때 `height` 가 된다. 좁은 폰에서는 비율 그대로 줄어든다 — 판이 잘리지 않게 */
const REF_WIDTH = 320;

export function WeekTower({
  days,
  logs,
  today,
  height = 150,
  className,
}: {
  /** 월 ~ 일 날짜 일곱 개 */
  days: string[];
  logs: DayLog[] | undefined;
  today: string;
  /** 폭이 320 일 때의 높이 */
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const minutes = days.map((d) => logs?.find((l) => l.date === d)?.minutes ?? 0);
  const top = Math.max(FLOOR_MINUTES, ...minutes);
  const heights = minutes.map((m) => (m > 0 ? Math.max(0.12, (m / top) * TALL) : 0));
  const key = `${days.join()}|${minutes.join()}|${today}`;

  useToonScene(
    host,
    SPEC,
    ({ THREE, addons, kit, palette, scene, still, seen }) => {
      const { keep, toon, solid } = kit;
      const root = new THREE.Group();
      scene.add(root);

      /* 판 — 섬처럼 흰 윗면 · 파란 띠 */
      const slab = new THREE.BoxGeometry(GAP * 7 + 0.3, 0.32, 1.5);
      slab.translate(0, -0.16, 0);
      const band = toon(palette.band, palette.bandShade, true);
      root.add(
        solid(slab, [band, band, toon(palette.top, palette.topShade, true), band, band, band]),
      );
      const edgeMaterial = keep(
        new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
      );
      const edges = (g: T.BufferGeometry) =>
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().fromEdgesGeometry(
              keep(new THREE.EdgesGeometry(g, 25)),
            ),
          ),
          edgeMaterial,
        );
      root.add(edges(slab));

      /* 기둥 — 꼭짓점이 이쪽을 보게 두면 두 면이 보여 입체가 산다 */
      const prism = keep(new THREE.CylinderGeometry(RADIUS, RADIUS, 1, 6));
      prism.translate(0, 0.5, 0);
      const prismEdges = keep(new THREE.EdgesGeometry(prism, 25));
      const prismLines = keep(new addons.LineSegmentsGeometry().fromEdgesGeometry(prismEdges));
      const top = toon(palette.white, palette.whiteShade, true, -1);
      const blue = toon(palette.blue, palette.blueShade, true);
      const yellow = toon(palette.yellow, palette.yellowShade, true);
      const rest = toon(palette.base, palette.baseShade, true, -1);

      const pillars = days.map((date, i) => {
        const group = new THREE.Group();
        group.position.set((i - 3) * GAP, 0, 0);
        const h = heights[i];
        const body = date === today ? yellow : h > 0 ? blue : rest;
        const mesh = solid(prism, [body, top, body]);
        group.add(mesh);
        group.add(new addons.LineSegments2(prismLines, edgeMaterial));
        // 쉰 날은 납작한 판 — 없는 것처럼 비우면 그날이 사라진 것처럼 보인다
        group.scale.y = h > 0 ? h : 0.06;
        root.add(group);
        return { group, height: h > 0 ? h : 0.06 };
      });

      // 마지막 기둥까지 다 솟는 데 걸리는 시간
      const growFor = (pillars.length - 1) * 0.06 + 0.55;
      return {
        busy: () => seen() < growFor,
        update() {
          if (still) return;
          // 보이는 순간 왼쪽부터 차례로 솟는다 — 한 번만
          const k = seen();
          for (const [i, p] of pillars.entries()) {
            const local = Math.min(1, Math.max(0, (k - i * 0.06) / 0.55));
            const ease = 1 - Math.pow(1 - local, 3);
            p.group.scale.y = Math.max(0.001, p.height * ease);
          }
        },
        resize(width, heightPx) {
          edgeMaterial.resolution.set(width, heightPx);
        },
      };
    },
    [key],
  );

  // 글자 자리 — 캔버스와 같은 셈으로 먼저 세운다
  const width = useWidth(host, REF_WIDTH);
  const tall = (width * height) / REF_WIDTH;
  return (
    <div
      ref={host}
      role="img"
      aria-label={days
        .map(
          (d, i) =>
            `${WEEKDAY[new Date(`${d}T00:00:00`).getDay()]} ${minutes[i] ? `${minutes[i]}분` : "쉼"}`,
        )
        .join(", ")}
      className={cn("relative w-full touch-pan-y select-none", className)}
      style={{ aspectRatio: `${REF_WIDTH} / ${height}` }}
    >
      <Labels
        days={days}
        minutes={minutes}
        heights={heights}
        today={today}
        height={tall}
        width={width}
      />
    </div>
  );
}

/** 기둥 위 분 · 판 앞 요일. 칸의 실제 크기로 셈한다 */
function Labels({
  days,
  minutes,
  heights,
  today,
  height,
  width,
}: {
  days: string[];
  minutes: number[];
  heights: number[];
  today: string;
  height: number;
  width: number;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {days.map((date, i) => {
        const x = (i - 3) * GAP;
        const topAt = projectOrtho(SPEC, [x, Math.max(heights[i], 0.06), 0], width, height);
        const footAt = projectOrtho(SPEC, [x, -0.32, 0.75], width, height);
        const left = topAt.x;
        const on = date === today;
        return (
          <div key={date}>
            {minutes[i] > 0 && (
              <span
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-full pb-1 text-xs font-extrabold tabular-nums",
                  on ? "text-signal-deep" : "text-ink",
                )}
                style={{ left, top: topAt.y }}
              >
                {minutes[i]}
              </span>
            )}
            <span
              className={cn(
                "text-micro absolute -translate-x-1/2 pt-1.5 font-bold",
                on ? "text-signal-deep" : "text-ink-soft",
              )}
              style={{ left: footAt.x, top: footAt.y }}
            >
              {WEEKDAY[new Date(`${date}T00:00:00`).getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
