"use client";

import { useEffect, useRef } from "react";

/*
  조각이 한 번 터진다 — 한 칸을 끝냈을 때, 오늘 것을 다 했을 때, 레벨이 올랐을 때.

  그림 조각(PNG)을 쓰지 않고 색 조각만 쓴다. 파랑 · 남색 · 노랑 · 연한 파랑 —
  앱의 색 그대로다. 예전 조각 그림은 결이 달라 화면 위에서 따로 놀았다.

  AGENTS.md 「three.js 는 이렇게만 쓴다」
    정사영 카메라 · 투명 바탕 · 그림자 없음 · 움직임 줄이기면 아예 안 그림 ·
    다 떨어지면 스스로 멈추고 치운다.
*/

/** 컴포넌트 밖에 둔다. 렌더마다 새 배열이면 effect 가 캔버스를 다시 만든다 */
const COLORS = [0x2784e6, 0x1b2574, 0xffb800, 0x9cc8f5];

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

  useEffect(() => {
    const el = host.current;
    if (!el || fire === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let stopped = false;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import("three");
      if (stopped) return;

      const width = el.clientWidth || window.innerWidth;
      const height = el.clientHeight || window.innerHeight;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      // 화면 픽셀 그대로의 정사영. 원근이 없다
      const camera = new THREE.OrthographicCamera(0, width, height, 0, -10, 10);
      const scene = new THREE.Scene();
      const geometry = new THREE.PlaneGeometry(1, 1);
      const materials = COLORS.map(
        (color) =>
          new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }),
      );

      type Bit = { mesh: InstanceType<typeof THREE.Mesh>; vx: number; vy: number; spin: number };
      const bits: Bit[] = [];
      for (let i = 0; i < pieces; i++) {
        const mesh = new THREE.Mesh(geometry, materials[i % materials.length]);
        const round = i % 3 === 0;
        mesh.scale.set(round ? 7 : 10, round ? 7 : 5, 1);
        const up = from === "bottom";
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
      let frame = 0;
      const tick = (now: number) => {
        const t = (now - started) / 1000;
        for (const b of bits) {
          b.vy -= 0.32; // 중력
          b.vx *= 0.99;
          b.mesh.position.x += b.vx;
          b.mesh.position.y += b.vy * (from === "bottom" ? 1 : 0.6);
          b.mesh.rotation.z += b.spin;
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
        renderer.domElement.remove();
      };
    })();

    return () => {
      stopped = true;
      cleanup();
    };
  }, [fire, pieces, from]);

  return <div ref={host} aria-hidden className="pointer-events-none fixed inset-0 z-50" />;
}
