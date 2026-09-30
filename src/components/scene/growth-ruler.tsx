"use client";

import { useRef, useState } from "react";
import type * as T from "three";

import { projectOrtho, type OrthoSpec } from "@/lib/ortho";
import { cn, formatDate } from "@/lib/utils";

import { useToonScene } from "./use-toon-scene";
import { useWidth } from "./use-width";

/**
 * 키 자 — 문틀에 키를 재 긋던 그 자. 잴 때마다 눈금이 하나 붙고, 눈금 옆에 그날의 키 · 몸무게 · 날짜를 적는다.
 *
 * 9/29 에 옆에 세운 키움이를 빼라는 말을 입체까지 통째로 걷는 것으로 잘못 읽었다 — 9/30 「통으로 없애냐」.
 * 캐릭터 없이 자만 다시 세운다. 정사영이라 눈금 사이가 cm 에 곧게 비례하고, 한 칸(5 · 10cm)마다 자 숫자를 붙인다.
 * 글자는 캔버스가 아니라 DOM 이다(`projectOrtho`) — 입체보다 먼저 서고, 확대해도 번지지 않는다.
 *
 * 면을 깔끔하게(9/29 「면도 깔끔하지 않고」):
 * - 자의 외곽선은 한 덩어리로 한 벌 — 10cm 띠마다 외곽선을 따로 주면 띠 사이에 검은 줄이 끼었다
 * - 육각 발판은 면마다 법선 하나 — 둥근 법선이면 한 면 가운데서 밝은 톤과 그늘 톤이 갈렸다
 */
const SPEC: OrthoSpec = { elevation: 12, azimuth: 24, target: 1.55, view: 2.25 };
/** 자 높이(세계 단위) */
const POLE = 3.4;
/** 자 굵기 · 자리. 오른쪽에 글자 자리를 남기려고 왼쪽으로 비켜 선다 */
const THICK = 0.36;
const POLE_X = -0.75;
/** 눈금 판 길이 — 자에서 오른쪽으로 나온다 */
const TAB = 0.5;
/** 이 폭일 때 `height` 가 된다. 좁은 폰에서는 비율 그대로 줄어든다 */
const REF_WIDTH = 320;
/** 글자 두 줄(키 · 몸무게와 날짜)이 겹치지 않는 간격(px) */
const LABEL_GAP = 30;
/** 이보다 많으면 처음과 최근 셋만 적는다 — 아래 잰 기록 줄에 전부 있다 */
const LABEL_MAX = 4;

export interface GrowthRecord {
  /** YYYY-MM-DD */
  date: string;
  heightCm: number;
  weightKg: number | null;
}

export function GrowthRuler({
  records,
  height = 260,
  className,
}: {
  /** 잰 키 · 몸무게. 오래된 것부터 */
  records: GrowthRecord[];
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  /** 입체가 섰다 — 그 전 · WebGL 이 없을 때는 같은 자리에 납작한 자가 선다 */
  const [ready, setReady] = useState(false);
  const cms = records.map((r) => r.heightCm);
  const min = Math.min(...cms);
  const max = Math.max(...cms);
  // 자 한 칸 — 잰 키가 모여 있으면 5cm, 넓으면 10cm. 눈금끼리 붙어 글자가 제 눈금을 떠나지 않게
  const step = max - min <= 10 ? 5 : 10;
  const lo = Math.floor((min - step * 0.6) / step) * step;
  const hi = Math.max(lo + step * 3, Math.ceil((max + step * 0.6) / step) * step);
  const at = (cm: number) => ((cm - lo) / (hi - lo)) * POLE;
  const marks = Array.from({ length: (hi - lo) / step + 1 }, (_, i) => lo + i * step);
  const key = records.map((r) => `${r.date}:${r.heightCm}`).join();

  useToonScene(
    host,
    SPEC,
    ({ THREE, addons, kit, palette, scene }) => {
      const { keep, toon, solid } = kit;
      const root = new THREE.Group();
      scene.add(root);
      const navy = keep(
        new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
      );
      const edges = (geometry: T.BufferGeometry) =>
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().fromEdgesGeometry(
              keep(new THREE.EdgesGeometry(geometry, 25)),
            ),
          ),
          navy,
        );

      /* 발판 — 작은 육각 판. 면마다 법선 하나 */
      const round = new THREE.CylinderGeometry(1.05, 1.05, 0.24, 6);
      round.translate(POLE_X, -0.12, 0);
      const slab = round.toNonIndexed();
      round.dispose();
      slab.computeVertexNormals();
      const band = toon(palette.band, palette.bandShade, true);
      root.add(solid(slab, [band, toon(palette.top, palette.topShade, true), band]));
      root.add(edges(slab));

      /* 자 — 안은 한 칸씩 띠(흰 · 파랑), 외곽선은 한 덩어리 */
      const pole = new THREE.Group();
      pole.position.set(POLE_X, 0, 0);
      root.add(pole);
      const white = toon(palette.white, palette.whiteShade, true);
      const blue = toon(palette.blue, palette.blueShade, true);
      for (let cm = lo, i = 0; cm < hi; cm += step, i++) {
        const piece = keep(new THREE.BoxGeometry(THICK, at(cm + step) - at(cm), THICK));
        piece.translate(0, (at(cm + step) + at(cm)) / 2, 0);
        pole.add(new THREE.Mesh(piece, i % 2 === 0 ? white : blue));
      }
      const whole = keep(new THREE.BoxGeometry(THICK, POLE, THICK));
      whole.translate(0, POLE / 2, 0);
      pole.add(new THREE.Mesh(kit.hullGeometry(whole), kit.hull));
      pole.add(edges(whole));

      /* 잰 눈금 — 지난 것은 연하게, 마지막은 노랑. 자 옆면에 딱 붙인다.
         자 안으로 파고들게 두면 눈금의 외곽선 껍데기가 자 앞면에 까만 흠집으로 비쳤다(9/30) — 껍데기 대신 선으로 두른다 */
      const tab = keep(new THREE.BoxGeometry(TAB, 0.06, 0.4));
      tab.translate(THICK / 2 + TAB / 2, 0, 0);
      const tabLines = keep(
        new addons.LineSegmentsGeometry().fromEdgesGeometry(keep(new THREE.EdgesGeometry(tab, 25))),
      );
      const pale = toon(palette.base, palette.baseShade, true, -1);
      const yellow = toon(palette.yellow, palette.yellowShade, true);
      records.forEach((r, i) => {
        const mark = new THREE.Group();
        mark.position.set(0, at(r.heightCm), 0);
        mark.add(new THREE.Mesh(tab, i === records.length - 1 ? yellow : pale));
        mark.add(new addons.LineSegments2(tabLines, navy));
        pole.add(mark);
      });

      return {
        // 움직이는 것이 없다 — 한 번 그리고 쉰다
        busy: () => false,
        resize(width, heightPx) {
          navy.resolution.set(width, heightPx);
        },
      };
    },
    [key],
    setReady,
  );

  const width = useWidth(host, REF_WIDTH);
  const tall = (width * height) / REF_WIDTH;
  const place = (x: number, y: number) => projectOrtho(SPEC, [x, y, 0], width, tall);

  // 글자를 적을 눈금 — 많으면 처음과 최근 셋
  const shown = records
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => records.length <= LABEL_MAX || i === 0 || i >= records.length - 3);
  // 위에서부터 차례로 내려 앉혀 겹치지 않게
  const tabEnd = POLE_X + THICK / 2 + TAB;
  const labels = shown
    .map(({ r, i }) => ({ r, last: i === records.length - 1, p: place(tabEnd, at(r.heightCm)) }))
    .sort((a, b) => a.p.y - b.p.y);
  labels.forEach((label, k) => {
    if (k > 0) label.p.y = Math.max(label.p.y, labels[k - 1].p.y + LABEL_GAP);
  });

  const foot = place(POLE_X, 0);
  const top = place(POLE_X, POLE);

  return (
    <div
      ref={host}
      role="img"
      aria-label={`키 · 몸무게 기록 — ${records
        .map(
          (r) =>
            `${formatDate(r.date)} ${r.heightCm}cm${r.weightKg != null ? ` ${r.weightKg}kg` : ""}`,
        )
        .join(", ")}`}
      className={cn("relative w-full select-none", className)}
      style={{ aspectRatio: `${REF_WIDTH} / ${height}` }}
    >
      {/* 입체가 서기 전 · WebGL 이 없을 때 — 같은 자리 같은 눈금의 납작한 자 */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          ready && "opacity-0",
        )}
      >
        <div
          className="border-signal-deep absolute flex w-3.5 -translate-x-1/2 flex-col-reverse overflow-hidden rounded-sm border-2"
          style={{ left: foot.x, top: top.y, height: foot.y - top.y }}
        >
          {marks.slice(0, -1).map((cm, i) => (
            <span key={cm} className={cn("flex-1", i % 2 === 0 ? "bg-paper" : "bg-signal")} />
          ))}
        </div>
        {records.map((r, i) => {
          const p = place(POLE_X, at(r.heightCm));
          return (
            <span
              key={r.date}
              className={cn(
                "absolute h-1 w-7 -translate-y-1/2 rounded-full",
                i === records.length - 1 ? "bg-mark" : "bg-signal-pale",
              )}
              style={{ left: p.x + 4, top: p.y }}
            />
          );
        })}
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {/* 자 숫자 — 한 칸마다, 자 왼쪽에 */}
        {marks.map((cm) => {
          const p = place(POLE_X - THICK / 2, at(cm));
          return (
            <span
              key={cm}
              className="text-micro text-faint absolute -translate-x-full -translate-y-1/2 pr-2 font-semibold tabular-nums"
              style={{ left: p.x, top: p.y }}
            >
              {cm}
            </span>
          );
        })}
        {/* 잰 날마다 — 키 · 몸무게 · 날짜 */}
        {labels.map(({ r, last, p }) => (
          <span
            key={r.date}
            className="absolute -translate-y-1/2 pl-2 whitespace-nowrap tabular-nums"
            style={{ left: p.x, top: p.y }}
          >
            <span
              className={cn(
                "block text-sm leading-tight font-extrabold",
                last ? "text-signal-deep" : "text-ink-soft",
              )}
            >
              {r.heightCm}cm
              {r.weightKg != null && (
                <span className="font-bold">
                  {" · "}
                  {r.weightKg}kg
                </span>
              )}
            </span>
            <span className="text-micro text-ink-soft block leading-tight font-semibold">
              {formatDate(r.date)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
