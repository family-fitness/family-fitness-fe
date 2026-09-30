"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";

import { LevelBuddy } from "@/components/domain/level-buddy";
import type { Stage } from "@/lib/levels";
import { cn } from "@/lib/utils";

import { BUDDY_FRAME, mascotImage } from "./buddy";
import { useToonScene, type CameraSpec } from "./use-toon-scene";

/**
 * 징검다리 — 칸마다 떠 있는 작은 육각 돌, 키움이가 지금 돌 위에 서 있다.
 *
 * 한 칸을 끝내면 그 돌이 파랗게 솟고, 키움이가 다음 돌로 폴짝 건너간다. 움직이는 것은
 * **그 순간 한 번**뿐이다(방금 해낸 순간). 그 사이에는 멈춰 있다 — 운동하기 화면에서
 * 움직이는 것은 타이머 링이고, 짜는 화면에서는 이 돌들이 전부다.
 *
 * 끝낸 돌 파랑 · 지금 돌 노랑 · 남은 돌 흰색. 마지막 돌에 깃발. 건넌 돌은 되돌아가지 않는다.
 */
const CAMERAS = {
  /** 좁은 띠 — 운동하기 위에 붙는다. 새싹 끝부터 돌 밑까지 딱 들어온다 */
  row: { elevation: 26, azimuth: 0, target: 0.52, view: 0.8 },
  /** 넓은 판 — 돌이 앞뒤로 엇갈리고, 돌마다 받침이 달려 작은 섬처럼 떠 있다 */
  zigzag: { elevation: 30, azimuth: 0, target: 0.42, view: 1.2 },
} satisfies Record<string, CameraSpec>;

/** 돌 반지름 · 남은 돌 두께 · 끝낸 돌 두께 */
const STONE = 0.44;
const LOW = 0.1;
const HIGH = 0.2;
/** 키움이 키(세계 단위, 발끝~머리) */
const BUDDY = { row: 0.8, zigzag: 0.95 };
/** 건너는 데 · 돌이 솟는 데 걸리는 초 */
const HOP = 0.55;
const RISE = 0.4;

type Layout = keyof typeof CAMERAS;

export function StoneTrail({
  count,
  done,
  current,
  stage,
  layout = "row",
  height,
  label,
  className,
}: {
  count: number;
  /** 끝낸 돌(0부터) */
  done: number[];
  /** 키움이가 서 있을 돌. 없으면 마지막으로 끝낸 돌 */
  current: number | null;
  stage: Stage;
  layout?: Layout;
  height: number;
  label: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const standIn = useRef<HTMLDivElement>(null);
  /** 입체가 섰다 — 그 전 · WebGL 이 없을 때는 납작한 점줄이 대신 선다 */
  const [ready, setReady] = useState(false);
  const live = useRef<{ done: number[]; current: number | null }>({ done, current });

  const wake = useToonScene(
    host,
    CAMERAS[layout],
    ({ THREE, addons, kit, palette, scene, toward, still, invalidate }) => {
      const { keep, toon, solid } = kit;
      const root = new THREE.Group();
      scene.add(root);
      const edge = keep(
        new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
      );
      const lines = (g: T.BufferGeometry) =>
        keep(
          new addons.LineSegmentsGeometry().fromEdgesGeometry(keep(new THREE.EdgesGeometry(g, 25))),
        );

      /* 돌 — 위 판(두께가 바뀐다) + 아래로 좁아지는 받침(섬처럼 떠 있다) */
      // 평평한 면이 이쪽을 보게 돌린다 — 꼭짓점이 오면 상자처럼 보인다
      const prism = keep(new THREE.CylinderGeometry(STONE, STONE, 1, 6));
      prism.rotateY(Math.PI / 6);
      prism.translate(0, 0.5, 0);
      const prismLines = lines(prism);
      // 넓은 판에서만 받침을 단다 — 작은 섬처럼 떠 있다. 좁은 띠에선 가는 선으로만 남아 어지럽다
      const floating = layout === "zigzag";
      const under = floating
        ? keep(new THREE.CylinderGeometry(STONE * 0.9, STONE * 0.22, 0.38, 6))
            .rotateY(Math.PI / 6)
            .translate(0, -0.19, 0)
        : null;
      const underLines = under ? lines(under) : null;
      const pale = under ? toon(palette.base, palette.baseShade, true) : null;

      const white = toon(palette.white, palette.whiteShade, true, -1);
      const blue = toon(palette.blue, palette.blueShade, true);
      const yellow = toon(palette.yellow, palette.yellowShade, true);
      // 옆면은 섬처럼 파란 띠. 윗면이 무엇인지 말한다 — 흰 남은 돌 · 노랑 지금 · 파랑 끝낸 돌
      const LOOK = {
        rest: [blue, white, blue],
        now: [blue, yellow, blue],
        done: [blue, blue, blue],
      } satisfies Record<string, T.Material[]>;

      const stones = Array.from({ length: count }, (_, i) => {
        const group = new THREE.Group();
        const slab = solid(prism, LOOK.rest);
        slab.scale.y = LOW;
        const slabEdges = new addons.LineSegments2(prismLines, edge);
        slabEdges.scale.y = LOW;
        group.add(slab, slabEdges);
        if (under && underLines && pale) {
          group.add(solid(under, pale), new addons.LineSegments2(underLines, edge));
        }
        root.add(group);
        return { group, slab, slabEdges, thick: LOW, rise: null as number | null, index: i };
      });

      /* 깃발 — 마지막 돌 */
      const flag = new THREE.Group();
      const pole = new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6);
      pole.translate(0, 0.31, 0);
      flag.add(solid(pole, toon(palette.line, palette.line)));
      const cloth = new THREE.BufferGeometry();
      cloth.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0.62, 0, 0, 0.4, 0, 0.3, 0.51, 0], 3),
      );
      cloth.computeVertexNormals();
      const clothMaterial = keep(
        new THREE.MeshBasicMaterial({ color: palette.yellow, side: THREE.DoubleSide }),
      );
      flag.add(new THREE.Mesh(keep(cloth), clothMaterial));
      flag.add(
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().setPositions([
              0, 0.62, 0, 0.3, 0.51, 0, 0.3, 0.51, 0, 0, 0.4, 0,
            ]),
          ),
          edge,
        ),
      );
      root.add(flag);

      /* 키움이 — 그림이 오면 선다 */
      const buddy = new THREE.Group();
      const hopper = new THREE.Group();
      buddy.add(hopper);
      root.add(buddy);
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
          const frame = BUDDY_FRAME;
          const tall = BUDDY[layout] / frame.body;
          sprite.center.set(0.5, frame.feet);
          sprite.scale.set(tall, tall, 1);
          hopper.add(sprite);
          invalidate();
        });
      }

      /* 자리 — 캔버스 폭에 맞춰 돌 사이를 정한다 */
      const spots: T.Vector3[] = stones.map(() => new THREE.Vector3());
      const lift = toward.clone().multiplyScalar(0.45);
      const place = (width: number, heightPx: number) => {
        const view = CAMERAS[layout].view;
        const half = (view * width) / heightPx;
        const room = 2 * half - 2 * STONE - 0.5;
        const gap = count > 1 ? Math.min(1.3, room / (count - 1)) : 0;
        stones.forEach((s, i) => {
          const z = layout === "zigzag" ? (i % 2 === 0 ? 0.32 : -0.32) : 0;
          s.group.position.set((i - (count - 1) / 2) * gap, 0, z);
          spots[i].copy(s.group.position);
        });
        const last = stones[count - 1];
        if (last) flag.position.copy(last.group.position).add(new THREE.Vector3(0.2, 0, -0.18));
      };

      const topOf = (i: number) => spots[i].clone().setY(stones[i].thick).add(lift);

      /* 받은 값 따라가기 */
      const shown = new Set<number>();
      let standing = 0;
      let hop: { from: number; to: number; at: number } | null = null;
      let first = true;
      const targetOf = (d: number[], c: number | null) =>
        Math.min(count - 1, Math.max(0, c ?? (d.length ? Math.max(...d) : 0)));

      const sync = (t: number) => {
        const { done: d, current: c } = live.current;
        for (const i of d) {
          if (i < 0 || i >= count || shown.has(i)) continue;
          shown.add(i);
          // 처음 그릴 때 이미 끝낸 돌은 솟은 채로 둔다
          if (first || still) stones[i].thick = HIGH;
          else stones[i].rise = t;
        }
        const target = targetOf(d, c);
        for (const s of stones) {
          const look = shown.has(s.index) ? LOOK.done : s.index === target ? LOOK.now : LOOK.rest;
          s.slab.material = look;
        }
        if (target !== standing && !hop) {
          if (first || still) standing = target;
          else hop = { from: standing, to: target, at: t };
        }
        first = false;
      };

      const ease = (k: number) => 1 - Math.pow(1 - k, 3);
      /** 살짝 넘쳤다 돌아온다 — 돌이 「퐁」 하고 솟는 맛 */
      const back = (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);

      return {
        // 건너는 중 · 솟는 중 · 아직 목표 돌에 닿지 않았으면 계속 그린다 — 건너는 도중에 온 새 목표를 놓치지 않게
        busy: () =>
          hop != null ||
          stones.some((s) => s.rise != null) ||
          targetOf(live.current.done, live.current.current) !== standing,
        update(t) {
          sync(t);
          for (const s of stones) {
            if (s.rise == null) continue;
            const k = Math.min(1, (t - s.rise) / RISE);
            s.thick = LOW + (HIGH - LOW) * back(k);
            if (k >= 1) {
              s.thick = HIGH;
              s.rise = null;
            }
          }
          for (const s of stones) {
            s.slab.scale.y = s.thick;
            s.slabEdges.scale.y = s.thick;
          }
          // 깃발은 마지막 돌 윗면에 꽂혀 있다
          flag.position.y = stones[count - 1]?.thick ?? 0;

          hopper.position.set(0, 0, 0);
          hopper.scale.set(1, 1, 1);
          if (hop) {
            const k = Math.min(1, (t - hop.at) / HOP);
            const from = topOf(hop.from);
            const to = topOf(hop.to);
            buddy.position.lerpVectors(from, to, ease(k));
            hopper.position.y = Math.sin(Math.PI * k) * 0.5;
            if (k >= 1) {
              standing = hop.to;
              hop = null;
              // 건너는 사이에 목표가 또 바뀌었으면 곧바로 이어서 건넌다
              sync(t);
            }
          } else {
            buddy.position.copy(topOf(standing));
          }
          // 건너기 시작할 때 웅크리고, 내려앉을 때 살짝 눌린다
          if (hop) {
            const k = (t - hop.at) / HOP;
            const squash = k < 0.12 ? Math.sin((k / 0.12) * Math.PI) * 0.1 : 0;
            hopper.scale.set(1 + squash * 0.6, 1 - squash, 1);
          }
        },
        resize(width, heightPx) {
          edge.resolution.set(width, heightPx);
          place(width, heightPx);
        },
        dispose() {
          gone = true;
        },
      };
    },
    [count, layout, stage],
    setReady,
  );

  // 받은 값이 바뀌면 장면을 새로 짓지 않고 따라가게만 한다
  const doneKey = done.join();
  useEffect(() => {
    live.current = { done: doneKey ? doneKey.split(",").map(Number) : [], current };
    wake();
  }, [doneKey, current, wake]);

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      className={cn("relative w-full select-none", className)}
      style={{ height }}
    >
      {/* 입체가 오기 전 · 없을 때 — 끝낸 칸 파랑, 지금 칸 노랑 점줄(넓은 판에는 키움이도) */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-500",
          ready && "opacity-0",
        )}
      >
        {layout === "zigzag" && <LevelBuddy stage={stage} size={Math.round(height * 0.55)} />}
        <span className="flex gap-2">
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className={cn(
                "size-3 rounded-full",
                done.includes(i)
                  ? "bg-signal"
                  : i === current
                    ? "bg-mark ring-signal-deep ring-2"
                    : "bg-bar",
              )}
            />
          ))}
        </span>
      </div>
      {/* 돌 위에 세울 키움이 그림의 원본. 화면에는 보이지 않는다 */}
      <div ref={standIn} aria-hidden className="hidden">
        <LevelBuddy stage={stage} size={160} />
      </div>
    </div>
  );
}
