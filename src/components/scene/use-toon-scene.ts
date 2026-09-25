"use client";

import { useCallback, useEffect, useEffectEvent, useRef, type RefObject } from "react";
import type * as T from "three";

import {
  loadThree,
  readPalette,
  toonKit,
  type Addons,
  type Palette,
  type Three,
  type ToonKit,
} from "./toon";

/**
 * 키움 섬 결의 입체 한 칸을 띄우는 틀. 요일 탑 · 키 자 · 징검다리가 이걸로 선다.
 *
 * 틀이 맡는 것 — three 를 늦게 받기, 정사영 카메라, 캔버스 크기, 화면 밖 · 탭 숨김이면
 * 멈추기, 움직임 줄이기, 떠날 때 WebGL 컨텍스트 돌려주기, 컨텍스트를 잃으면 비키기.
 * 장면이 맡는 것 — 무엇을 어디에 세우고 매 장면 어떻게 움직이는지(`build`).
 *
 * 캔버스는 받은 자리(`host`) 안에 깔린다. 첫 장면을 그린 뒤에 나타나므로(투명 → 불투명)
 * 받기 전에 그 자리에 세워 둔 것(글 · 캐릭터)이 먼저 보인다.
 */
interface SceneContext {
  THREE: Three;
  addons: Addons;
  palette: Palette;
  kit: ToonKit;
  scene: T.Scene;
  /** 카메라 쪽을 가리키는 단위 벡터. 종이 인형을 앞으로 당길 때 쓴다 */
  toward: T.Vector3;
  /** 움직임 줄이기 — 켜져 있으면 한 장면만 그린다 */
  still: boolean;
  /**
   * 화면에 처음 들어온 뒤 몇 초. 들어오기 전에는 `Infinity` 다 —
   * 자라나는 장면은 이걸로 셈하면 보이기 전엔 **다 자란 모습**, 보이는 순간부터 자란다.
   * 아래쪽 카드가 아무도 안 볼 때 혼자 자라 버리지 않고, 인쇄 · 전체 화면 캡처에도 값이 남는다
   */
  seen(): number;
  /** 한 번 더 그려 달라 — 쉬고 있을 때 그림이 뒤늦게 도착했을 때 */
  invalidate(): void;
}

interface SceneHandle {
  /** 매 장면. 움직임 줄이기면 처음 한 번과 invalidate 때만 불린다 */
  update?(t: number, dt: number): void;
  /**
   * 아직 움직이는 중인가. 없으면 늘 움직인다.
   * `false` 면 다음 `wake` 까지 그리기를 쉰다 — 다 자란 그래프가 배터리를 먹지 않게
   */
  busy?(): boolean;
  /** 크기가 바뀌었다 — 외곽선 굵기 · 글자 자리 */
  resize?(width: number, height: number): void;
  dispose?(): void;
}

export interface CameraSpec {
  /** 높이각(도). 0 이면 정면 */
  elevation: number;
  /** 방위각(도) */
  azimuth: number;
  /** 카메라가 보는 높이 */
  target?: number;
  /** 정사영 반높이(세계 단위) */
  view: number;
}

/**
 * 돌려주는 것은 `wake` — 장면이 쉬고 있을 때 다시 움직이게 한다. 받은 값이 바뀌어
 * 장면을 새로 짓지 않고 움직임만 주고 싶을 때(징검다리 건너기) 부른다.
 */
export function useToonScene(
  host: RefObject<HTMLDivElement | null>,
  camera: CameraSpec,
  build: (ctx: SceneContext) => SceneHandle | null,
  deps: readonly unknown[],
  /**
   * 첫 장면이 섰다(`true`) — 대신 세워 둔 것을 치울 때.
   * 컨텍스트를 잃었거나 장면을 다시 짓는 중이면 `false` — 대신 세워 둔 것을 다시 보일 때.
   * 캔버스가 비켰는데 대신 세운 것도 숨어 있으면 칸이 빈다
   */
  onReady?: (ready: boolean) => void,
) {
  const ready = useEffectEvent((on: boolean) => onReady?.(on));
  const make = useEffectEvent((ctx: SceneContext) => build(ctx));
  const waker = useRef<() => void>(() => {});

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let teardown = () => {};

    void (async () => {
      let loaded;
      try {
        loaded = await loadThree();
      } catch {
        return; // 받지 못하면 대신 세워 둔 것만 남는다
      }
      if (disposed) return;
      const { THREE, addons } = loaded;

      let renderer: T.WebGLRenderer;
      try {
        // 2배 화면이면 계단이 보이지 않는다 — 안티에일리어싱을 끄고 가볍게(장면 둘셋이 한 화면에 선다)
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: window.devicePixelRatio < 2 });
      } catch {
        return; // WebGL 이 없다
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.setAttribute("aria-hidden", "true");
      canvas.className = "absolute inset-0 size-full opacity-0 transition-opacity duration-500";
      el.appendChild(canvas);

      const target = camera.target ?? 0;
      const el3 = (camera.elevation * Math.PI) / 180;
      const az = (camera.azimuth * Math.PI) / 180;
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
      const distance = 40;
      cam.position.set(
        Math.cos(el3) * Math.sin(az) * distance,
        target + Math.sin(el3) * distance,
        Math.cos(el3) * Math.cos(az) * distance,
      );
      cam.lookAt(0, target, 0);
      cam.updateMatrixWorld();
      const light = new THREE.Vector3(-0.55, 0.72, 0.42)
        .normalize()
        .transformDirection(cam.matrixWorld);
      const toward = cam.position
        .clone()
        .sub(new THREE.Vector3(0, target, 0))
        .normalize();
      const palette = readPalette();
      const kit = toonKit(THREE, addons, palette, light);
      const scene = new THREE.Scene();

      const size = { width: el.clientWidth || 1, height: el.clientHeight || 1 };
      let raf = 0;
      let running = false;
      let last = performance.now();
      const clock = () => performance.now() / 1000;
      let seenAt: number | null = null;
      const seen = () => (seenAt === null ? Infinity : clock() - seenAt);

      let handle: SceneHandle | null = null;
      const draw = (dt = 0) => {
        handle?.update?.(clock(), dt);
        renderer.render(scene, cam);
      };
      const invalidate = () => {
        if (!running) draw();
      };

      const ctx: SceneContext = {
        THREE,
        addons,
        palette,
        kit,
        scene,
        toward,
        still,
        seen,
        invalidate,
      };

      const fit = () => {
        size.width = el.clientWidth || 1;
        size.height = el.clientHeight || 1;
        renderer.setSize(size.width, size.height, false);
        const aspect = size.width / size.height;
        cam.left = -camera.view * aspect;
        cam.right = camera.view * aspect;
        cam.top = camera.view;
        cam.bottom = -camera.view;
        cam.updateProjectionMatrix();
        kit.setPixelsPerUnit(size.height / (2 * camera.view));
        handle?.resize?.(size.width, size.height);
      };
      fit();

      /** 세우지 못했다 — 컨텍스트까지 돌려주고 비킨다. 대신 세워 둔 것이 그대로 남는다 */
      const giveUp = () => {
        handle?.dispose?.();
        kit.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      };
      try {
        handle = make(ctx);
        if (!handle) throw new Error("장면 없음");
        handle.resize?.(size.width, size.height);
        draw();
      } catch {
        giveUp();
        return;
      }

      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        draw(dt);
        if (!running) return;
        // 다 움직였으면 쉰다. 깨우면(wake) 다시 돈다
        if (handle?.busy && !handle.busy()) {
          running = false;
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      const start = () => {
        if (running || still || disposed) return;
        seenAt ??= clock();
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      canvas.classList.replace("opacity-0", "opacity-100");
      ready(true);

      let visible = true;
      waker.current = () => {
        if (disposed) return;
        if (still || !visible || document.hidden) invalidate();
        else start();
      };
      // 한 번에 여러 개가 오면 마지막이 지금이다
      const observer = new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible && !document.hidden) start();
        else stop();
      });
      observer.observe(el);
      const onVisibility = () => (document.hidden || !visible ? stop() : start());
      document.addEventListener("visibilitychange", onVisibility);
      const resizer = new ResizeObserver(() => {
        fit();
        invalidate();
      });
      resizer.observe(el);

      const lost = (e: Event) => {
        e.preventDefault();
        stop();
        canvas.style.opacity = "0";
        ready(false);
      };
      canvas.addEventListener("webglcontextlost", lost);

      teardown = () => {
        stop();
        waker.current = () => {};
        observer.disconnect();
        resizer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", lost);
        giveUp();
      };
    })();

    return () => {
      disposed = true;
      ready(false);
      teardown();
    };
    // 카메라는 처음 값으로 고정한다. 장면이 바뀌어야 하면 deps 로 다시 짓는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useCallback(() => waker.current(), []);
}
