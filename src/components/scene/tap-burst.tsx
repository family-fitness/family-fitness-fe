"use client";

import { useEffect, useImperativeHandle, useRef, type RefObject } from "react";
import type { Sprite, Texture } from "three";

/** 누를 때마다 튀어오르는 조각. */
export interface TapBurstHandle {
  /** 화면 좌표(0~1)에서 터뜨린다 */
  fire: (x: number, y: number) => void;
}

interface Piece {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  spin: number;
}

export function TapBurst({
  ref,
  assets,
  className,
}: {
  ref?: RefObject<TapBurstHandle | null>;
  assets: string[];
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fireRef = useRef<(x: number, y: number) => void>(() => {});

  useImperativeHandle(ref, () => ({ fire: (x, y) => fireRef.current(x, y) }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let stop = () => {};

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);

      // 원근도 그림자도 없다. 화면 좌표를 그대로 쓴다
      const camera = new THREE.OrthographicCamera(0, width, height, 0, -1, 1);
      const scene = new THREE.Scene();

      const loader = new THREE.TextureLoader();
      const textures: Texture[] = await Promise.all(
        assets.map(
          (name) =>
            new Promise<Texture>((resolve, reject) =>
              loader.load(`/assets/${name}.png`, resolve, undefined, reject),
            ),
        ),
      ).catch(() => []);
      if (disposed || textures.length === 0) return;

      const materials = textures.map(
        (map) => new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }),
      );
      const pieces: Piece[] = [];

      fireRef.current = (nx, ny) => {
        const x = nx * width;
        const y = (1 - ny) * height;
        for (let i = 0; i < 8; i += 1) {
          const sprite = new THREE.Sprite(materials[i % materials.length]);
          const size = 16 + Math.random() * 18;
          sprite.scale.set(size, size, 1);
          sprite.position.set(x, y, 0);
          scene.add(sprite);
          const angle = Math.PI * 0.25 + Math.random() * Math.PI * 0.5;
          const power = 160 + Math.random() * 200;
          pieces.push({
            sprite,
            vx: Math.cos(angle) * power * (Math.random() < 0.5 ? -1 : 1),
            vy: Math.sin(angle) * power,
            life: 1,
            spin: (Math.random() - 0.5) * 6,
          });
        }
      };

      let raf = 0;
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        for (let i = pieces.length - 1; i >= 0; i -= 1) {
          const p = pieces[i];
          p.vy -= 900 * dt; // 중력
          p.sprite.position.x += p.vx * dt;
          p.sprite.position.y += p.vy * dt;
          p.sprite.material.rotation += p.spin * dt;
          p.life -= dt * 1.1;
          p.sprite.material.opacity = Math.max(0, p.life);
          if (p.life <= 0) {
            scene.remove(p.sprite);
            pieces.splice(i, 1);
          }
        }

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      stop = () => {
        cancelAnimationFrame(raf);
        pieces.forEach((p) => scene.remove(p.sprite));
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      stop();
    };
  }, [assets]);

  return <div ref={hostRef} aria-hidden className={className} />;
}
