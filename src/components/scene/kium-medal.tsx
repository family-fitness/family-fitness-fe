"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { loadThree, readPalette, toonKit } from "./toon";

/**
 * 업적 메달 — 육각형 메달이 한 바퀴 반 돌며 나타나고, 손으로 돌려 볼 수 있다.
 *
 * 키움 섬과 같은 결이다(AGENTS.md 「three.js 는 이렇게 쓴다」): 정사영 · 두 톤 면 ·
 * 굵은 남색 외곽선. 앞면에는 배지 그림(2D 에셋)을 그대로 얹는다 — 그림을 입체로
 * 다시 만들지 않는다. 뒷면은 남색.
 *
 * three 를 받기 전에는 그림만 먼저 선다. 움직임 줄이기면 앞을 보고 멈춰 있다.
 */
export function KiumMedal({
  art,
  size = 200,
  label,
  className,
}: {
  /** 앞면 그림 — 실제로 있는 파일 이름(`artFor` 로 고른 것). 없으면 빈 면 */
  art: string | null;
  size?: number;
  label: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const standIn = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    const stand = standIn.current;
    if (!el || !stand) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    let teardown = () => {};

    void (async () => {
      let loaded;
      try {
        loaded = await loadThree();
      } catch {
        return; // 그림만 남는다
      }
      const { THREE, addons } = loaded;
      const texture = art
        ? await new Promise<InstanceType<typeof THREE.Texture> | null>((resolve) =>
            new THREE.TextureLoader().load(`/assets/${art}.png`, resolve, undefined, () =>
              resolve(null),
            ),
          )
        : null;
      if (disposed) {
        texture?.dispose();
        return;
      }

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        texture?.dispose();
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.setAttribute("aria-hidden", "true");
      canvas.className = "absolute inset-0 size-full opacity-0 transition-opacity duration-300";
      el.appendChild(canvas);

      // 정면에서 본다. 빛은 왼쪽 위 앞 — 돌리면 옆면에 그늘이 진다
      const VIEW = 1.4;
      const camera = new THREE.OrthographicCamera(-VIEW, VIEW, VIEW, -VIEW, 0.1, 50);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      const light = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();
      const palette = readPalette();
      const kit = toonKit(THREE, addons, palette, light, [3.2, 2.2]);

      const medal = new THREE.Group();

      /*
        육각 기둥을 눕혀 앞을 보게 한다 — 위아래가 뾰족한 육각형. 옆면 · 앞면 · 뒷면 차례.
        앞면은 노랑(금메달), 그 안에 흰 판을 한 겹 — 그림이 그 판 위에 앉는다.
      */
      const THICK = 0.26;
      const body = new THREE.CylinderGeometry(1, 1, THICK, 6);
      body.rotateX(Math.PI / 2);
      medal.add(
        kit.solid(body, [
          kit.toon(palette.yellow, palette.yellowShade, true),
          kit.toon(palette.yellow, palette.yellowShade, true, -0.2),
          kit.toon(palette.line, palette.line, true),
        ]),
      );
      const plate = new THREE.Mesh(
        kit.keep(new THREE.CircleGeometry(0.8, 6).rotateZ(Math.PI / 6)),
        kit.toon(palette.white, palette.whiteShade, true, -1),
      );
      plate.position.z = THICK / 2 + 0.002;
      medal.add(plate);

      /* 모서리 선과 앞면 안쪽 육각 테 */
      const hexAt = (r: number, z: number) => {
        const points: number[] = [];
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI) / 3;
          const b = ((k + 1) * Math.PI) / 3;
          points.push(Math.sin(a) * r, -Math.cos(a) * r, z, Math.sin(b) * r, -Math.cos(b) * r, z);
        }
        return points;
      };
      const edges = kit.keep(new THREE.EdgesGeometry(body, 25));
      const linePositions = [
        ...Array.from(edges.getAttribute("position").array),
        ...hexAt(0.8, THICK / 2 + 0.004),
      ];
      const lineGeometry = kit.keep(new addons.LineSegmentsGeometry().setPositions(linePositions));
      const lineMaterial = kit.keep(
        new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
      );
      medal.add(new addons.LineSegments2(lineGeometry, lineMaterial));

      /* 앞면 그림 */
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        kit.keep(texture);
        const face = new THREE.Mesh(
          kit.keep(new THREE.PlaneGeometry(1.12, 1.12)),
          kit.keep(
            new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1 }),
          ),
        );
        face.position.z = THICK / 2 + 0.006;
        medal.add(face);
      }

      const scene = new THREE.Scene();
      scene.add(medal);

      const resize = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        const aspect = w / h;
        camera.left = -VIEW * aspect;
        camera.right = VIEW * aspect;
        camera.updateProjectionMatrix();
        kit.setPixelsPerUnit(h / (2 * VIEW));
        lineMaterial.resolution.set(w, h);
      };
      resize();

      /* 나타나기 — 작게 시작해 튀어 오르고, 한 바퀴 반 돌아 앞을 본다 */
      let visible = true;
      const clock = () => performance.now() / 1000;
      const born = clock();
      let spin = 0; // 손으로 돌린 만큼
      let velocity = 0;
      let dragging: { last: number } | null = null;
      let raf = 0;
      let running = false;
      let last = performance.now();

      const draw = () => {
        const t = clock() - born;
        let reveal = 0;
        let scale = 1;
        if (!still) {
          const k = Math.min(1, t / 1.3);
          reveal = -3 * Math.PI * Math.pow(1 - k, 3);
          const p = Math.min(1, t / 0.8);
          scale =
            p >= 1 ? 1 : Math.pow(2, -9 * p) * Math.sin((p * 8 - 0.75) * ((2 * Math.PI) / 3)) + 1;
        }
        // 다 나타난 뒤에는 가만히 앞을 본다 — 제자리에서 흔들리며 떠 있지 않는다(9/23 「호버링은 제거」)
        medal.rotation.y = reveal + spin;
        medal.scale.setScalar(Math.max(0.001, scale));
        renderer.render(scene, camera);
      };
      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!dragging) {
          spin += velocity * dt;
          velocity *= Math.pow(0.03, dt);
          // 손을 놓으면 가장 가까운 앞면으로 돌아온다
          if (Math.abs(velocity) < 0.6) {
            const home = Math.round(spin / (2 * Math.PI)) * 2 * Math.PI;
            spin += (home - spin) * Math.min(1, dt * 4);
          }
        }
        draw();
        if (!running) return;
        // 나타나기가 끝나고 손을 놓은 채 앞면에 섰으면 쉰다 — 가만히 있는 메달을 계속 그리지 않는다
        const settled =
          !dragging &&
          clock() - born > 1.3 &&
          Math.abs(velocity) < 0.01 &&
          Math.abs(spin - Math.round(spin / (2 * Math.PI)) * 2 * Math.PI) < 0.001;
        if (settled) {
          running = false;
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (running || still || disposed) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      const down = (e: PointerEvent) => {
        dragging = { last: e.clientX };
        velocity = 0;
        // 쉬던 메달을 다시 깨운다 — 손을 놓은 뒤 앞면으로 돌아오는 것까지 그린다
        if (visible && !document.hidden) start();
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        const step = (e.clientX - dragging.last) * 0.014;
        dragging.last = e.clientX;
        spin += step;
        velocity = step * 60;
        if (!running) draw();
      };
      const up = () => {
        dragging = null;
        if (still) {
          spin = Math.round(spin / (2 * Math.PI)) * 2 * Math.PI;
          draw();
        }
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);

      draw();
      canvas.classList.replace("opacity-0", "opacity-100");
      stand.style.opacity = "0";

      // 한 번에 여러 개가 오면 마지막이 지금이다
      const observer = new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible && !document.hidden) start();
        else stop();
      });
      observer.observe(el);
      const onVisibility = () => (document.hidden || !visible ? stop() : start());
      document.addEventListener("visibilitychange", onVisibility);
      // 컨텍스트를 잃으면(폰은 컨텍스트 수가 적다) 비키고 그림을 다시 세운다 — 빈 네모가 남지 않게
      const lost = (e: Event) => {
        e.preventDefault();
        stop();
        canvas.style.opacity = "0";
        stand.style.opacity = "";
      };
      canvas.addEventListener("webglcontextlost", lost);

      teardown = () => {
        stop();
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", lost);
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        kit.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
        stand.style.opacity = "";
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, [art]);

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      className={cn("relative touch-pan-y touch-pinch-zoom select-none", className)}
      style={{ width: size, height: size }}
    >
      {/* 입체가 오기 전 — 그림만 먼저 */}
      <div
        ref={standIn}
        aria-hidden
        className="pointer-events-none absolute inset-[22%] transition-opacity duration-300"
      >
        {art && (
          // eslint-disable-next-line @next/next/no-img-element -- 작은 그림 한 장
          <img src={`/assets/${art}.png`} alt="" className="size-full object-contain" />
        )}
      </div>
    </div>
  );
}
