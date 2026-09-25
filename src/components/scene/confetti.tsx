"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { readPalette } from "./toon";

/*
  조각이 한 번 터진다 — 한 칸을 끝냈을 때, 오늘 것을 다 했을 때, 레벨이 올랐을 때.

  그림 조각(PNG)을 쓰지 않고 색 조각만 쓴다. 파랑 · 남색 · 노랑 — 앱의 토큰 색
  그대로다(readPalette). 예전 조각 그림은 결이 달라 화면 위에서 따로 놀았다.

  AGENTS.md 「three.js 는 이렇게 쓴다」
    정사영 카메라 · 투명 바탕 · 그림자 없음 · 움직임 줄이기면 아예 안 그림 ·
    다 떨어지면 스스로 멈추고 치운다(컨텍스트까지 돌려준다 — 폰은 WebGL 컨텍스트 수가 적다).
    WebGL 이 없으면 조용히 안 터진다.
*/

export function Confetti({
  fire,
  pieces = 70,
  from = "bottom",
}: {
  /** 바뀔 때마다 한 번 터진다. 0 이면 안 터진다 */
  fire: number;
  pieces?: number;
  /** 아래에서 솟구치거나(한 칸 끝) 위에서 쏟아지거나(다 했어요) */
  from?: "bottom" | "top";
}) {
  const host = useRef<HTMLDivElement>(null);
  // 몇 조각 · 어디서는 터지는 순간의 값을 읽는다 — 바뀌었다고 지난 조각을 다시 터뜨리지 않는다
  const shape = useEffectEvent(() => ({ pieces, from }));

  useEffect(() => {
    const el = host.current;
    if (!el || fire === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { pieces: count, from: start } = shape();

    let stopped = false;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import("three");
      if (stopped) return;

      const width = el.clientWidth || window.innerWidth;
      const height = el.clientHeight || window.innerHeight;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        // 작은 조각이라 계단 현상이 보이지 않는다 — 안티에일리어싱 없이 가볍게
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      // 화면 픽셀 그대로의 정사영. 원근이 없다
      const camera = new THREE.OrthographicCamera(0, width, height, 0, -10, 10);
      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneGeometry(1, 1);
      const p = readPalette();
      const materials = [p.blue, p.line, p.yellow].map(
        (color) =>
          new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }),
      );

      type Bit = { mesh: InstanceType<typeof THREE.Mesh>; vx: number; vy: number; spin: number };
      const bits: Bit[] = [];
      const up = start === "bottom";
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geometry, materials[i % materials.length]);
        const round = i % 3 === 0;
        mesh.scale.set(round ? 7 : 10, round ? 7 : 5, 1);
        mesh.position.set(
          up ? width / 2 + (Math.random() - 0.5) * 60 : Math.random() * width,
          up ? -10 : height + 10 + Math.random() * 80,
          0,
        );
        mesh.rotation.z = Math.random() * Math.PI;
        scene.add(mesh);
        bits.push({
          mesh,
          vx: up ? (Math.random() - 0.5) * 9 : (Math.random() - 0.5) * 2,
          vy: up ? 11 + Math.random() * 7 : -(2 + Math.random() * 3),
          spin: (Math.random() - 0.5) * 0.3,
        });
      }

      const started = performance.now();
      let last = started;
      let frame = 0;
      const tick = (now: number) => {
        const t = (now - started) / 1000;
        // 60Hz 한 칸을 1로 — 120Hz 화면에서 두 배 빨리 떨어지지 않게
        const dt = Math.min(3, (now - last) / (1000 / 60));
        last = now;
        for (const b of bits) {
          b.vy -= 0.32 * dt; // 중력
          b.vx *= 0.99 ** dt;
          b.mesh.position.x += b.vx * dt;
          b.mesh.position.y += b.vy * dt * (up ? 1 : 0.6);
          b.mesh.rotation.z += b.spin * dt;
        }
        // 1.4초부터 옅어지고 2.2초에 끝
        const fade = Math.max(0, 1 - Math.max(0, t - 1.4) / 0.8);
        for (const m of materials) m.opacity = fade;
        renderer.render(scene, camera);
        if (t < 2.2 && !stopped) frame = requestAnimationFrame(tick);
        else cleanup();
      };
      frame = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(frame);
        geometry.dispose();
        materials.forEach((m) => m.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        cleanup = () => {};
      };
    })();

    return () => {
      stopped = true;
      cleanup();
    };
  }, [fire]);

  // 앱 틀 너비만큼만 — 데스크톱에서 창 전체에 2배 해상도 캔버스를 깔지 않는다
  return (
    <div
      ref={host}
      aria-hidden
      className="pointer-events-none fixed inset-y-0 left-1/2 z-50 w-full max-w-(--width-phone) -translate-x-1/2"
    />
  );
}
