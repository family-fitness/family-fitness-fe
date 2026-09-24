"use client";

import { useRef, useState } from "react";
import type * as T from "three";

import { LevelBuddy } from "@/components/domain/level-buddy";
import type { Stage } from "@/lib/levels";
import { cn } from "@/lib/utils";

import { buddyFrame } from "./buddy";
import { mascotImage } from "./kium-island";
import { useToonScene, type CameraSpec } from "./use-toon-scene";

/**
 * 가족 다리 — 이번 주 우리 가족이 같이 움직인 만큼 두 섬 사이에 널판이 놓인다.
 *
 * 누가 몇 분 했는지는 나누지 않는다 — **가족 합**만(규칙 10 · 조사 「가족 퀘스트, 합만」).
 * 목표를 채우면 다리가 이어지고 키움이가 건너편 섬 깃발에 닿는다. 모자라도 탓하지 않는다 —
 * 놓인 널판은 놓인 그대로다. 널판 수가 곧 비율이라 값을 속이지 않고, 분은 글자로 같이 적는다.
 */
const CAMERA: CameraSpec = { elevation: 26, azimuth: 0, target: 0.2, view: 1.2 };
const REF_WIDTH = 320;
/** 다리 널판 수 — 한 칸이 목표의 10% */
const PLANKS = 10;
const SPAN = 3.2;

export function FamilyBridge({
  minutes,
  goal,
  stage,
  height = 130,
  className,
}: {
  minutes: number;
  goal: number;
  stage: Stage;
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const standIn = useRef<HTMLDivElement>(null);
  /** 입체가 섰다 — 그 전 · WebGL 이 없을 때는 널판 줄이 대신 선다 */
  const [ready, setReady] = useState(false);
  const ratio = goal > 0 ? Math.min(1, minutes / goal) : 0;
  const laid = Math.floor(ratio * PLANKS + 1e-9);

  useToonScene(
    host,
    CAMERA,
    ({ THREE, addons, kit, palette, scene, toward, still, seen, invalidate }) => {
      const { keep, toon, solid } = kit;
      const edge = keep(
        new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
      );
      const lines = (g: T.BufferGeometry) =>
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().fromEdgesGeometry(
              keep(new THREE.EdgesGeometry(g, 25)),
            ),
          ),
          edge,
        );

      /* 두 섬 — 왼쪽 우리 집 섬, 오른쪽 목표 섬(깃발) */
      const islet = (x: number) => {
        const top = new THREE.CylinderGeometry(0.62, 0.62, 0.18, 6);
        top.translate(0, -0.09, 0);
        const under = new THREE.CylinderGeometry(0.58, 0.18, 0.5, 6);
        under.translate(0, -0.18 - 0.25, 0);
        const band = toon(palette.band, palette.bandShade, true);
        const g = new THREE.Group();
        g.add(solid(top, [band, toon(palette.top, palette.topShade, true), band]), lines(top));
        g.add(solid(under, toon(palette.base, palette.baseShade, true, -0.3)), lines(under));
        g.position.x = x;
        scene.add(g);
        return g;
      };
      const left = -SPAN / 2 - 0.5;
      const right = SPAN / 2 + 0.5;
      islet(left);
      const goalIslet = islet(right);

      // 목표 섬 깃발
      const pole = new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6);
      pole.translate(0, 0.31, 0);
      const flag = new THREE.Group();
      flag.add(solid(pole, toon(palette.line, palette.line)));
      const shape = new THREE.Shape([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.3, -0.1),
        new THREE.Vector2(0, -0.2),
      ]);
      const cloth = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
      const clothMesh = solid(cloth, toon(palette.yellow, palette.yellowShade));
      clothMesh.position.set(0.02, 0.6, 0);
      flag.add(clothMesh);
      flag.position.set(0.18, 0, -0.12);
      goalIslet.add(flag);

      /* 널판 — 놓인 만큼만. 파랑 · 노랑 번갈아 */
      const plankGeometry = keep(new THREE.BoxGeometry(SPAN / PLANKS - 0.05, 0.08, 0.5));
      const plankLines = keep(
        new addons.LineSegmentsGeometry().fromEdgesGeometry(
          keep(new THREE.EdgesGeometry(plankGeometry)),
        ),
      );
      const blue = toon(palette.blue, palette.blueShade, true);
      const yellow = toon(palette.yellow, palette.yellowShade, true);
      const planks = Array.from({ length: laid }, (_, i) => {
        const g = new THREE.Group();
        g.add(solid(plankGeometry, i % 2 === 0 ? blue : yellow));
        g.add(new addons.LineSegments2(plankLines, edge));
        g.position.set(-SPAN / 2 + (i + 0.5) * (SPAN / PLANKS), -0.06, 0);
        scene.add(g);
        return g;
      });
      // 난간 줄 — 다리 자리 전체를 흐리게 보여 준다(어디까지 가야 하는지)
      const ropeMaterial = keep(
        new addons.LineMaterial({
          color: new THREE.Color(palette.baseShade).getHex(),
          linewidth: 2,
        }),
      );
      scene.add(
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().setPositions([
              -SPAN / 2,
              0.22,
              -0.26,
              SPAN / 2,
              0.22,
              -0.26,
              -SPAN / 2,
              0.22,
              0.26,
              SPAN / 2,
              0.22,
              0.26,
            ]),
          ),
          ropeMaterial,
        ),
      );

      /* 키움이 — 놓인 널판 끝에 선다. 다 놓이면 목표 섬 */
      const figure = new THREE.Group();
      // 난간 줄보다 앞에 — 줄이 키움이 몸을 가로지르지 않게
      const lift = toward.clone().multiplyScalar(0.55);
      const end =
        laid >= PLANKS
          ? right - 0.15
          : laid === 0
            ? left + 0.1
            : -SPAN / 2 + laid * (SPAN / PLANKS) - 0.1;
      const startX = left + 0.1;
      figure.position.copy(lift).add(new THREE.Vector3(startX, 0, 0));
      scene.add(figure);
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
          const frame = buddyFrame(stage);
          const tall = 0.7 / frame.body;
          sprite.center.set(0.5, frame.feet);
          sprite.scale.set(tall, tall, 1);
          figure.add(sprite);
          invalidate();
        });
      }

      const walkFor = 0.35 + laid * 0.12;
      return {
        busy: () => seen() < walkFor + 0.2,
        update() {
          // 처음 보일 때 널판이 하나씩 놓이고 키움이가 따라 걷는다
          const k = still ? 1 : Math.min(1, Math.max(0, seen() / walkFor));
          planks.forEach((p, i) => {
            const at = (i + 1) / Math.max(1, laid);
            const s = still ? 1 : Math.min(1, Math.max(0, (k - at + 0.2) / 0.2));
            p.scale.set(1, 1, s || 0.0001);
            p.visible = s > 0;
          });
          const x = startX + (end - startX) * (1 - Math.pow(1 - k, 2));
          figure.position.copy(lift).add(new THREE.Vector3(x, 0, 0));
          // 걷는 동안 콩콩
          const bob = still || k >= 1 ? 0 : Math.abs(Math.sin(seen() * 14)) * 0.05;
          figure.position.y += bob;
        },
        resize(w, h) {
          edge.resolution.set(w, h);
          ropeMaterial.resolution.set(w, h);
        },
        dispose() {
          gone = true;
        },
      };
    },
    [laid, stage],
    () => setReady(true),
  );

  return (
    <div
      ref={host}
      role="img"
      aria-label={`이번 주 우리 가족 ${minutes}분, 목표 ${goal}분. 다리 ${laid}칸 놓였어요`}
      className={cn("relative w-full touch-pan-y select-none", className)}
      style={{ aspectRatio: `${REF_WIDTH} / ${height}` }}
    >
      {/* 입체가 오기 전 · 없을 때 — 놓인 널판만큼 칠한 열 칸 */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-1 px-6 transition-opacity duration-500",
          ready && "opacity-0",
        )}
      >
        {Array.from({ length: PLANKS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 flex-1 rounded-sm",
              i < laid ? (i % 2 === 0 ? "bg-signal" : "bg-mark") : "bg-sub",
            )}
          />
        ))}
      </div>
      <div ref={standIn} aria-hidden className="hidden">
        <LevelBuddy stage={stage} size={160} />
      </div>
    </div>
  );
}
