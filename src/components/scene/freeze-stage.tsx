"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";

import { LevelBuddy } from "@/components/domain/level-buddy";
import type { Stage } from "@/lib/levels";
import { cn } from "@/lib/utils";

import { buddyFrame } from "./buddy";
import { PLAY_CAMERA, buddyScale, buildPlayStage } from "./play-stage";
import { useToonScene } from "./use-toon-scene";

/**
 * 얼음땡 무대 — 작은 섬 위에서 키움이가 박자에 맞춰 뛴다.
 *
 * 「얼음!」 이면 발밑에서 얼음 기둥이 솟아 키움이를 가두고(비치는 연한 파랑 — 안이 보인다),
 * 「땡!」 이면 얼음이 조각나 튀어 흩어진다. 한 화면에 움직이는 것은 이 무대 하나다.
 *
 * 움직임 줄이기면 뛰지 않고, 얼음은 바로 서고 바로 사라진다(조각 없음).
 */
export type FreezeMode = "idle" | "dance" | "frozen" | "thaw";

const ICE = { radius: 0.74, height: 1.72 };
const SHARDS = 16;

export function FreezeStage({
  stage,
  mode,
  phase,
  height = 280,
  className,
}: {
  stage: Stage;
  mode: FreezeMode;
  /** 박자 안의 자리(0~1). 박자에 맞춰 뛴다 */
  phase: () => number | null;
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const standIn = useRef<HTMLDivElement>(null);
  /** 입체가 섰다 — 그 전 · WebGL 이 없을 때는 키움이 그림이 무대 자리에 선다 */
  const [ready, setReady] = useState(false);
  const live = useRef({ mode, phase });
  /** 키움이 그림의 몸 비율 — 주문한 그림과 코드 그림이 다르다 */
  const frame = buddyFrame(stage);
  useEffect(() => {
    live.current = { mode, phase };
  });

  const wake = useToonScene(
    host,
    PLAY_CAMERA,
    (ctx) => {
      const { THREE, kit, palette, scene, still, clock } = ctx;
      const { keep, toon, solid } = kit;
      let sprite: T.Sprite | null = null;
      const scale = buddyScale(frame);
      const stage = buildPlayStage(
        ctx,
        [standIn.current],
        ([s]) => {
          sprite = s ?? null;
        },
        frame,
      );
      const { lines } = stage;

      /* 얼음 기둥 — 비치는 연한 파랑, 남색 모서리, 흰 빛줄 둘 */
      const ice = new THREE.Group();
      // 평평한 면이 이쪽을 보게 — 빛줄이 그 면에 붙는다
      const block = new THREE.CylinderGeometry(ICE.radius, ICE.radius, ICE.height, 6);
      block.rotateY(Math.PI / 6);
      block.translate(0, ICE.height / 2, 0);
      const iceMaterial = keep(
        new THREE.MeshBasicMaterial({
          color: palette.base,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
        }),
      );
      const iceMesh = new THREE.Mesh(keep(block), iceMaterial);
      iceMesh.renderOrder = 2;
      ice.add(iceMesh, lines(block));
      const shine = keep(new THREE.PlaneGeometry(0.08, 0.9));
      const shineMaterial = keep(
        new THREE.MeshBasicMaterial({ color: palette.white, transparent: true, opacity: 0.9 }),
      );
      for (const [x, y, w] of [
        [-0.28, 1.05, 1],
        [-0.14, 1.2, 0.6],
      ] as const) {
        const s = new THREE.Mesh(shine, shineMaterial);
        s.position.set(x, y, ICE.radius * 0.87 + 0.01);
        s.scale.set(w, w, 1);
        s.rotation.z = -0.35;
        s.renderOrder = 3;
        ice.add(s);
      }
      ice.visible = false;
      scene.add(ice);

      /* 얼음 조각 */
      const shardGeometry = keep(new THREE.TetrahedronGeometry(0.13));
      const shardMaterial = toon(palette.base, palette.baseShade);
      const shards = Array.from({ length: SHARDS }, () => {
        const m = solid(shardGeometry, shardMaterial);
        m.visible = false;
        scene.add(m);
        return { mesh: m, velocity: new THREE.Vector3(), spin: new THREE.Vector3() };
      });

      let shown: FreezeMode = "idle";
      let changedAt = 0;
      const white = new THREE.Color(palette.white);
      const frost = new THREE.Color(palette.base);

      const enter = (mode: FreezeMode, t: number) => {
        shown = mode;
        changedAt = t;
        if (mode === "frozen") {
          ice.visible = true;
          ice.scale.y = still ? 1 : 0.001;
        }
        if (mode === "thaw" || mode === "idle" || mode === "dance") {
          const wasIce = ice.visible;
          ice.visible = false;
          if (wasIce && !still && mode === "thaw") {
            shards.forEach((s, i) => {
              const a = (i / SHARDS) * Math.PI * 2 + Math.random() * 0.3;
              const y = 0.2 + Math.random() * ICE.height;
              s.mesh.position.set(Math.sin(a) * ICE.radius, y, Math.cos(a) * ICE.radius);
              s.velocity.set(
                Math.sin(a) * (1.6 + Math.random()),
                1.4 + Math.random() * 1.6,
                Math.cos(a) * (1.6 + Math.random()),
              );
              s.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
              s.mesh.visible = true;
              s.mesh.scale.setScalar(1);
            });
          }
        }
      };

      return {
        busy() {
          if (shown === "dance") return true;
          if (shown === "frozen") return clock() - changedAt < 0.3;
          return shards.some((s) => s.mesh.visible);
        },
        update(t, dt) {
          const { mode, phase } = live.current;
          if (mode !== shown) enter(mode, t);

          // 얼어 있으면 키움이가 살짝 푸르스름해진다
          if (sprite) {
            const material = sprite.material;
            material.color.copy(shown === "frozen" ? frost : white);
            let hop = 0;
            let squash = 0;
            let sway = 0;
            if (shown === "dance" && !still) {
              const p = phase() ?? 0;
              hop = Math.sin(Math.PI * p) * 0.16;
              squash = p < 0.12 ? (1 - p / 0.12) * 0.07 : 0;
              sway = Math.sin(2 * Math.PI * p) * 0.07;
            }
            if (shown === "thaw" && !still) {
              const k = (t - changedAt) / 0.45;
              if (k < 1) hop = Math.sin(Math.PI * k) * 0.35;
            }
            sprite.position.y = hop;
            sprite.scale.set(scale * (1 + squash), scale * (1 - squash), 1);
            material.rotation = sway;
          }

          if (shown === "frozen" && !still) {
            const k = Math.min(1, (t - changedAt) / 0.22);
            // 쑥 솟았다가 살짝 넘치고 선다
            ice.scale.y = Math.max(0.001, 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2));
          }

          for (const s of shards) {
            if (!s.mesh.visible) continue;
            s.velocity.y -= 6.5 * dt;
            s.mesh.position.addScaledVector(s.velocity, dt);
            s.mesh.rotation.x += s.spin.x * dt;
            s.mesh.rotation.y += s.spin.y * dt;
            const age = t - changedAt;
            s.mesh.scale.setScalar(Math.max(0.001, 1 - age / 0.8));
            if (age > 0.8) s.mesh.visible = false;
          }
        },
        resize(width, heightPx) {
          stage.resize(width, heightPx);
        },
        dispose() {
          stage.dispose();
        },
      };
    },
    [stage],
    () => setReady(true),
  );

  // 무대가 바뀌면 깨운다 — 춤 · 얼음 · 땡
  useEffect(() => {
    wake();
  }, [mode, wake]);

  return (
    <div
      ref={host}
      aria-hidden
      className={cn("relative w-full touch-pan-y select-none", className)}
      style={{ height }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex items-end justify-center pb-[12%] transition-opacity duration-500",
          ready && "opacity-0",
        )}
      >
        <LevelBuddy stage={stage} size={Math.round(height * 0.55)} />
      </div>
      <div ref={standIn} className="hidden">
        <LevelBuddy stage={stage} size={160} />
      </div>
    </div>
  );
}
