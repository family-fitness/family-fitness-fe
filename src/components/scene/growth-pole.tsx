"use client";

import { useRef } from "react";

import { LevelBuddy } from "@/components/domain/level-buddy";
import type { Stage } from "@/lib/levels";
import { projectOrtho, type OrthoSpec } from "@/lib/ortho";
import { cn } from "@/lib/utils";

import { mascotImage } from "./kium-island";
import { useToonScene } from "./use-toon-scene";

/**
 * 키 자 — 문틀에 키를 재 긋던 그 자. 잴 때마다 노랑 눈금이 하나씩 붙는다.
 *
 * 옆에 키움이가 **마지막으로 잰 키만큼** 서 있다. 자란 만큼이 눈으로 보인다(규칙 11 —
 * 다시 재기는 덮어쓰기가 아니라 추가라서, 지난 눈금이 남는다).
 * 정사영이라 눈금 사이 간격이 cm 에 곧게 비례한다. 숫자와 날짜는 글자로 얹는다.
 */
const SPEC: OrthoSpec = { elevation: 12, azimuth: 24, target: 1.55, view: 2.25 };
/** 자 높이(세계 단위) */
const POLE = 3.4;

export function GrowthPole({
  records,
  stage,
  height = 260,
  className,
}: {
  /** 잰 키. 오래된 것부터 */
  records: { date: string; heightCm: number }[];
  stage: Stage;
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const standIn = useRef<HTMLDivElement>(null);
  const cms = records.map((r) => r.heightCm);
  const lo = Math.floor((Math.min(...cms) - 8) / 10) * 10;
  const hi = Math.max(lo + 20, Math.ceil((Math.max(...cms) + 6) / 10) * 10);
  const at = (cm: number) => ((cm - lo) / (hi - lo)) * POLE;
  const key = `${records.map((r) => `${r.date}:${r.heightCm}`).join()}|${stage}`;

  useToonScene(
    host,
    SPEC,
    ({ THREE, addons, kit, palette, scene, toward, invalidate }) => {
      const { keep, toon, solid } = kit;
      const root = new THREE.Group();
      scene.add(root);
      const navy = keep(
        new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
      );

      /* 발판 — 작은 육각 섬 */
      const slab = new THREE.CylinderGeometry(1.35, 1.35, 0.26, 6);
      slab.translate(0, -0.13, 0);
      const band = toon(palette.band, palette.bandShade, true);
      root.add(solid(slab, [band, toon(palette.top, palette.topShade, true), band]));
      root.add(
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().fromEdgesGeometry(
              keep(new THREE.EdgesGeometry(slab, 25)),
            ),
          ),
          navy,
        ),
      );

      /* 자 — 10cm 마다 흰 · 파랑이 번갈아 */
      const pole = new THREE.Group();
      pole.position.set(0.15, 0, 0);
      root.add(pole);
      const white = toon(palette.white, palette.whiteShade, true);
      const blue = toon(palette.blue, palette.blueShade, true);
      for (let cm = lo, i = 0; cm < hi; cm += 10, i++) {
        const piece = new THREE.BoxGeometry(0.36, at(cm + 10) - at(cm), 0.36);
        piece.translate(0, (at(cm + 10) + at(cm)) / 2, 0);
        pole.add(solid(piece, i % 2 === 0 ? white : blue));
      }
      const outline = new THREE.BoxGeometry(0.36, POLE, 0.36);
      outline.translate(0, POLE / 2, 0);
      pole.add(
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().fromEdgesGeometry(
              keep(new THREE.EdgesGeometry(outline, 25)),
            ),
          ),
          navy,
        ),
      );
      keep(outline);

      /* 잰 눈금 — 지난 것은 연하게, 마지막은 노랑 */
      const tab = keep(new THREE.BoxGeometry(0.62, 0.07, 0.42));
      const pale = toon(palette.base, palette.baseShade, true, -1);
      const yellow = toon(palette.yellow, palette.yellowShade, true);
      records.forEach((r, i) => {
        const mark = solid(tab, i === records.length - 1 ? yellow : pale);
        mark.position.set(0.31, at(r.heightCm), 0);
        pole.add(mark);
      });

      /* 키움이 — 마지막 키만큼. 그림 발끝이 발판에 닿고 머리가 노랑 눈금에 닿는다 */
      const latest = at(cms[cms.length - 1]);
      const figure = new THREE.Group();
      figure.position
        .copy(toward)
        .multiplyScalar(0.3)
        .add(new THREE.Vector3(-0.8, 0, 0));
      root.add(figure);
      // 그림은 늦게 온다. 그 사이에 화면을 떠났으면 세우지 않는다
      let gone = false;
      const stand = standIn.current;
      if (stand) {
        void mascotImage(stand).then((image) => {
          if (!image || gone) return;
          const texture = keep(new THREE.Texture(image));
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
          const sprite = new THREE.Sprite(
            keep(new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.35 })),
          );
          // 키움이 그림(160칸)에서 발끝은 151칸째, 머리 꼭대기는 54칸째다 — 새싹은 머리 위로 솟는다
          const tall = latest / ((151 - 54) / 160);
          sprite.center.set(0.5, 9 / 160);
          sprite.scale.set(tall, tall, 1);
          figure.add(sprite);
          invalidate();
        });
      }

      return {
        // 움직이는 것이 없다. 그림이 도착하면 한 번 더 그린다(invalidate)
        busy: () => false,
        resize(width, heightPx) {
          navy.resolution.set(width, heightPx);
        },
        dispose() {
          gone = true;
        },
      };
    },
    [key],
  );

  const width = 358;
  return (
    <div
      ref={host}
      role="img"
      aria-label={`키가 자란 자취 — ${records.map((r) => `${r.date.slice(5).replace("-", "월 ")}일 ${r.heightCm}cm`).join(", ")}`}
      className={cn("relative w-full select-none", className)}
      style={{ height }}
    >
      {/* 섬 위에 세울 키움이 그림의 원본. 화면에는 보이지 않는다 */}
      <div ref={standIn} aria-hidden className="hidden">
        <LevelBuddy stage={stage} size={160} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {records.map((r, i) => {
          const p = projectOrtho(SPEC, [0.15 + 0.64, at(r.heightCm), 0], width, height);
          const last = i === records.length - 1;
          return (
            <span
              key={r.date}
              className={cn(
                "absolute -translate-y-1/2 pl-1 text-xs whitespace-nowrap tabular-nums",
                last ? "text-signal-deep font-extrabold" : "text-ink-soft font-bold",
              )}
              style={{ left: `calc(50% + ${p.x - width / 2}px)`, top: p.y }}
            >
              {r.heightCm}
              <span className="text-micro ml-1 font-semibold">{Number(r.date.slice(5, 7))}월</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
