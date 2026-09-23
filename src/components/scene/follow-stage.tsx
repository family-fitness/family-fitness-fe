"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";

import { LevelBuddy } from "@/components/domain/level-buddy";
import type { Stage } from "@/lib/levels";
import { cn } from "@/lib/utils";

import { BUDDY_SCALE, buildPlayStage } from "./play-stage";
import { useToonScene, type CameraSpec } from "./use-toon-scene";

/**
 * 따라 해 봐 무대 — 키움이가 동작을 먼저 해 보인다. 아이는 보고 따라 한다.
 *
 * 종이 인형이라 팔다리를 따로 움직이지 않는다. 대신 몸 전체로 흉내 낸다 —
 * 박수는 두 번 움찔하며 앞에 동그라미, 만세는 두 팔 든 그림, 한 바퀴는 종이처럼 뒤집히며 돈다.
 * 동작 이름은 화면 글자가 크게 말한다. 움직임 줄이기면 가만히 서 있고 글자만 바뀐다.
 *
 * 동작 차례는 `lib/play.ts` 의 `FOLLOW_MOVES` 와 같다.
 */
const CAMERA: CameraSpec = { elevation: 24, azimuth: 0, target: 0.5, view: 1.55 };
/** 동작 하나에 걸리는 초 */
export const MOVE_SECONDS = 1.6;

/** 0~1 사이 t 에서 c 를 꼭짓점으로 한 짧은 봉우리 */
const bump = (t: number, c: number, w = 0.1) => Math.max(0, 1 - Math.abs(t - c) / w);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 그 순간부터 퍼지는 동그라미 — 퍼진 정도(0~1). 안 퍼질 때는 null */
const ringAt = (u: number, starts: number[], length = 0.24) => {
  for (const c of starts) {
    const k = (u - c) / length;
    if (k >= 0 && k < 1) return k;
  }
  return null;
};

export function FollowStage({
  stage,
  move,
  playKey,
  height = 260,
  className,
}: {
  stage: Stage;
  /** 지금 해 보일 동작 번호. null 이면 가만히 선다 */
  move: number | null;
  /** 같은 동작을 한 번 더 해 보일 때도 바뀌는 값 */
  playKey: number;
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const standIn = useRef<HTMLDivElement>(null);
  /** 입체가 섰다 — 그 전 · WebGL 이 없을 때는 키움이 그림이 무대 자리에 선다 */
  const [ready, setReady] = useState(false);
  const cheerIn = useRef<HTMLDivElement>(null);
  const live = useRef({ move, playKey });
  useEffect(() => {
    live.current = { move, playKey };
  });

  const wake = useToonScene(
    host,
    CAMERA,
    (ctx) => {
      const { THREE, kit, palette, scene, toward, still } = ctx;
      const { keep } = kit;
      let normal: T.Sprite | null = null;
      let cheer: T.Sprite | null = null;
      const play = buildPlayStage(ctx, [standIn.current, cheerIn.current], ([a, b]) => {
        normal = a ?? null;
        cheer = b ?? null;
      });

      /* 동그라미 — 박수 치는 앞, 발 구르는 바닥 */
      const ringMaterial = keep(
        new THREE.MeshBasicMaterial({
          color: palette.line,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      const clapRing = new THREE.Mesh(keep(new THREE.RingGeometry(0.16, 0.22, 36)), ringMaterial);
      clapRing.position
        .copy(toward)
        .multiplyScalar(0.9)
        .add(new THREE.Vector3(0, 0.62, 0));
      clapRing.lookAt(clapRing.position.clone().add(toward));
      clapRing.visible = false;
      const floorRing = new THREE.Mesh(keep(new THREE.RingGeometry(0.5, 0.58, 48)), ringMaterial);
      floorRing.rotation.x = -Math.PI / 2;
      floorRing.position.y = 0.01;
      floorRing.visible = false;
      scene.add(clapRing, floorRing);

      let seenKey = live.current.playKey;
      let current: { move: number; at: number } | null = null;

      /** 한 동작의 한 순간. u 는 0~1 */
      const pose = (m: number, u: number) => {
        let hop = 0;
        let squash = 0;
        let turn = 1;
        let tilt = 0;
        let arms = false;
        let clap: number | null = null;
        let stomp: number | null = null;
        switch (m) {
          case 0: // 박수 두 번
            squash = (bump(u, 0.3) + bump(u, 0.62)) * 0.06;
            clap = ringAt(u, [0.3, 0.62]);
            break;
          case 1: // 만세
            arms = u > 0.12 && u < 0.9;
            hop = arms ? 0.06 : 0;
            break;
          case 2: {
            // 제자리 뛰기 한 번
            const k = clamp01((u - 0.12) / 0.55);
            hop = Math.sin(Math.PI * k) * 0.55;
            squash = (bump(u, 0.1, 0.08) + bump(u, 0.68, 0.08)) * 0.08;
            break;
          }
          case 3: // 한 발 들기 — 한쪽으로 기운다
            tilt = -0.2 * Math.sin(Math.PI * clamp01((u - 0.1) / 0.8));
            hop = 0.05 * Math.sin(Math.PI * clamp01((u - 0.1) / 0.8));
            break;
          case 4: // 무릎 두 번 치기 — 깊게 두 번
            squash = (bump(u, 0.3, 0.14) + bump(u, 0.66, 0.14)) * 0.13;
            break;
          case 5: // 한 바퀴 돌기 — 종이 인형처럼 뒤집히며
            turn = Math.cos(2 * Math.PI * clamp01((u - 0.1) / 0.75));
            break;
          case 6: // 발 구르기 두 번
            hop = (bump(u, 0.22, 0.1) + bump(u, 0.56, 0.1)) * 0.12;
            stomp = ringAt(u, [0.3, 0.64], 0.3);
            break;
          case 7: // 어깨 으쓱
            squash = -bump(u, 0.45, 0.22) * 0.09;
            break;
        }
        return { hop, squash, turn, tilt, arms, clap, stomp };
      };

      return {
        busy: () => current != null,
        update(t) {
          const { move: m, playKey: key } = live.current;
          if (key !== seenKey) {
            seenKey = key;
            current = m == null || still ? null : { move: m, at: t };
          }
          const u = current ? (t - current.at) / MOVE_SECONDS : 1;
          const p = current && u < 1 ? pose(current.move, u) : pose(-1, 0);
          if (current && u >= 1) current = null;

          const shown = p.arms && cheer ? cheer : normal;
          for (const s of [normal, cheer] as (T.Sprite | null)[]) {
            if (!s) continue;
            s.visible = s === shown;
            s.position.y = p.hop;
            s.scale.set(BUDDY_SCALE * (1 + p.squash) * p.turn, BUDDY_SCALE * (1 - p.squash), 1);
            s.material.rotation = p.tilt;
          }
          // 퍼지면서 옅어진다
          const ring = p.clap ?? p.stomp;
          clapRing.visible = p.clap != null;
          floorRing.visible = p.stomp != null;
          if (ring != null) {
            ringMaterial.opacity = 1 - ring;
            clapRing.scale.setScalar(0.6 + ring * 1.2);
            floorRing.scale.setScalar(0.7 + ring * 0.6);
          }
        },
        resize(width, heightPx) {
          play.resize(width, heightPx);
        },
        dispose() {
          play.dispose();
        },
      };
    },
    [stage],
    () => setReady(true),
  );

  useEffect(() => {
    wake();
  }, [playKey, wake]);

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
      <div ref={cheerIn} className="hidden">
        <LevelBuddy stage={stage} cheer size={160} />
      </div>
    </div>
  );
}
