"use client";

import { useEffect, useRef } from "react";

import { LevelBuddy } from "@/components/domain/level-buddy";
import type { Stage } from "@/lib/levels";
import { decorationsAt, type DecorationId } from "@/lib/unlocks";
import { cn } from "@/lib/utils";

import { ISLAND, buildIsland, footRatio, type Island } from "./island";
import { loadThree, readPalette } from "./toon";

/**
 * 키움 섬 — 아이 홈 맨 위.
 *
 * 운동한 날마다 섬에 나무가 하나씩 자란다. 가운데에 레벨 캐릭터가 선다.
 * 손가락으로 섬을 돌리고, 누르면 캐릭터가 한 번 뛴다. 그 밖에는 **멈춰 있다** — 떠다니지 않고,
 * 움직일 것이 없으면 그리기도 쉰다(첫 화면의 천천히 도는 섬만 계속 돈다).
 *
 * three 는 늦게 받는다. 받기 전에는 **캐릭터만 먼저 같은 자리에** 서 있다가 섬이
 * 뒤에서 나타난다 — 빈 칸이 먼저 뜨지 않는다. WebGL 이 없거나 받지 못하면 캐릭터만 남는다.
 *
 * 움직임 줄이기면 멈춘 한 장면으로 그린다. 섬은 꾸밈이 아니라 내용이라 지우지 않는다.
 * 화면 밖으로 나가거나 탭이 숨으면 멈춘다.
 */
export function KiumIsland({
  stage,
  plants,
  seed,
  cheer = false,
  grow = false,
  spin = "drag",
  level = null,
  unveil = null,
  height = 280,
  label,
  className,
}: {
  stage: Stage;
  /** 레벨 — 이 레벨까지 열린 장식이 섬에 선다. 모르면 장식 없이 */
  level?: number | null;
  /** 방금 열린 장식 — 나무가 자란 뒤에 튀어나온다(레벨 업 순간) */
  unveil?: DecorationId | null;
  /** 세울 나무 수 — 지금까지 운동한 날. 아직 모르면 null — 캐릭터만 세워 두고 기다린다 */
  plants: number | null;
  /** 나무 자리를 정하는 씨앗. 프로필 id */
  seed: string;
  /** 캐릭터가 두 팔을 번쩍. 방금 해낸 순간 */
  cheer?: boolean;
  /** 가장 최근 나무가 자라나는 모습을 보여 준다 */
  grow?: boolean;
  /** auto 면 천천히 저절로 돈다(첫 화면). 어느 쪽이든 손으로 돌릴 수 있다 */
  spin?: "drag" | "auto";
  height?: number;
  /** 화면 읽기 프로그램이 읽을 한 줄 */
  label: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const standIn = useRef<HTMLDivElement>(null);
  const mascotSize = Math.round(height * ISLAND.mascot);
  const decorKey = decorationsAt(level).join();

  useEffect(() => {
    const el = host.current;
    const stand = standIn.current;
    // 나무 수를 모르는 채로 지었다가 다시 지으면 섬이 두 번 깜빡인다
    if (!el || !stand || plants === null) return;
    const count = plants;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    let teardown = () => {};

    void (async () => {
      let loaded;
      try {
        loaded = await loadThree();
      } catch {
        return; // 받지 못하면 캐릭터만 남는다
      }
      const mascot = await mascotImage(stand);
      if (disposed) return;
      const { THREE, addons } = loaded;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        return; // WebGL 이 없다
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.setAttribute("aria-hidden", "true");
      canvas.className = "absolute inset-0 size-full opacity-0 transition-opacity duration-500";
      el.appendChild(canvas);

      // 정사영 — 높이각 30도, 오른쪽 앞에서 본다
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      const distance = 20;
      camera.position.set(
        Math.cos(ISLAND.elevation) * Math.sin(ISLAND.azimuth) * distance,
        ISLAND.target + Math.sin(ISLAND.elevation) * distance,
        Math.cos(ISLAND.elevation) * Math.cos(ISLAND.azimuth) * distance,
      );
      camera.lookAt(0, ISLAND.target, 0);
      camera.updateMatrixWorld();
      // 빛은 카메라에 붙인다 — 왼쪽 위 앞에서. 섬을 돌려도 밝은 쪽이 그대로다
      const light = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();
      light.transformDirection(camera.matrixWorld);

      const scene = new THREE.Scene();
      let island: Island;
      try {
        island = buildIsland(THREE, addons, {
          plants: count,
          seed,
          decorations: decorKey ? (decorKey.split(",") as DecorationId[]) : [],
          // 움직임 줄이기면 튀어나오지 않는다 — 처음부터 서 있다
          unveil: still ? null : unveil,
          palette: readPalette(),
          mascot,
          light,
          toward: camera.position
            .clone()
            .sub(new THREE.Vector3(0, ISLAND.target, 0))
            .normalize(),
        });
      } catch {
        renderer.dispose();
        canvas.remove();
        return;
      }
      scene.add(island.root, island.clouds, island.figure);

      const size = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        const aspect = w / h;
        camera.left = -ISLAND.view * aspect;
        camera.right = ISLAND.view * aspect;
        camera.top = ISLAND.view;
        camera.bottom = -ISLAND.view;
        camera.updateProjectionMatrix();
        island.resize(w, h);
      };
      size();

      /* 그리기 */
      let angle = 0;
      let velocity = 0;
      let raf = 0;
      let running = false;
      let visible = true;
      let last = performance.now();
      const clock = () => performance.now() / 1000;

      const draw = () => {
        island.root.rotation.y = angle;
        island.update(clock());
        renderer.render(scene, camera);
      };
      let dragging: { at: number; last: number; moved: number } | null = null;
      /* 새 나무를 보여 줄 때 섬이 그쪽으로 돌아선다. 새 나무는 캐릭터 오른쪽 앞에 선다 */
      let turn: { from: number; to: number; at: number } | null = null;
      // 무엇을 보여 주려고 돌아서나 — 레벨이 올라 새 장식이 열렸으면 그 장식(이쪽 조금 오른쪽),
      // 아니면 오늘 자란 나무(오른쪽 앞). 장식이 레벨 업의 주인공이다
      const toFace = (angle: number, offset: number) =>
        Math.atan2(
          Math.sin(ISLAND.azimuth + offset - angle),
          Math.cos(ISLAND.azimuth + offset - angle),
        );
      const facing =
        island.unveiled !== null
          ? toFace(island.unveiled, 0.35)
          : grow && island.newest !== null
            ? toFace(island.newest, 0.75)
            : null;
      if (still && facing !== null) angle = facing;
      /*
        자라는 순간은 **처음 보일 때** 튼다. 지을 때 틀면, 섬이 화면 아래에 있는 동안
        아무도 안 보는 데서 나무가 다 자라 버린다(다 했어요 카드가 늦게 내려올 때).
      */
      let armed = grow && !still;
      const fire = () => {
        if (!armed) return;
        armed = false;
        const now = clock();
        if (facing !== null) turn = { from: angle, to: facing, at: now };
        island.sprout(now);
        if (unveil) island.reveal(now);
      };
      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (turn && !dragging) {
          const k = Math.min(1, (clock() - turn.at) / 0.8);
          angle = turn.from + (turn.to - turn.from) * (1 - Math.pow(1 - k, 3));
          if (k === 1) turn = null;
        } else if (!dragging) {
          angle += velocity * dt;
          velocity *= Math.pow(0.05, dt);
          if (spin === "auto") angle += dt * 0.22;
        }
        draw();
        if (!running) return;
        // 돌리는 손도, 도는 힘도, 자라는 나무도 없으면 쉰다. 누르면 다시 깨어난다
        const idle =
          !dragging && !turn && Math.abs(velocity) < 0.002 && spin !== "auto" && !island.busy();
        if (idle) {
          running = false;
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      const wake = () => {
        if (visible && !document.hidden) start();
      };
      const start = () => {
        if (running || still || disposed) return;
        fire();
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      /* 돌리기 · 누르기. 세로로 쓸면 화면이 내려간다(touch-action: pan-y) */
      const down = (e: PointerEvent) => {
        dragging = { at: performance.now(), last: e.clientX, moved: 0 };
        turn = null;
        velocity = 0;
        wake();
        // 손을 섬 밖으로 끌고 나가도 끝까지 돌린다. 못 잡는 기기도 있다 — 그러면 그냥 둔다
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragging.last;
        dragging.last = e.clientX;
        dragging.moved += Math.abs(dx) + Math.abs(e.movementY);
        const step = dx * 0.012;
        angle += step;
        velocity = step * 60;
        if (!running) draw();
      };
      const up = () => {
        if (!dragging) return;
        const tap = dragging.moved < 6 && performance.now() - dragging.at < 400;
        dragging = null;
        if (tap && !still) island.hop(clock());
        if (still) velocity = 0;
        if (!running) draw();
        wake();
      };
      // 화면을 내리려던 손이면 뛰지 않는다
      const cancel = () => {
        dragging = null;
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", cancel);

      draw();
      // 첫 장면을 그린 뒤에 바꿔 낀다. 캐릭터는 같은 자리에 있으니 섬만 나타난다
      canvas.classList.replace("opacity-0", "opacity-100");
      stand.style.opacity = "0";

      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !document.hidden) start();
        else stop();
      });
      observer.observe(el);
      const onVisibility = () => (document.hidden || !visible ? stop() : start());
      document.addEventListener("visibilitychange", onVisibility);
      const resizer = new ResizeObserver(() => {
        size();
        if (!running) draw();
      });
      resizer.observe(el);

      // 컨텍스트를 잃으면(메모리가 모자란 폰) 캐릭터만 남긴다
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
        resizer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", cancel);
        canvas.removeEventListener("webglcontextlost", lost);
        island.dispose();
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
  }, [plants, seed, grow, spin, stage, cheer, decorKey, unveil]);

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      className={cn("relative w-full touch-pan-y select-none", className)}
      style={{ height }}
    >
      {/* 섬이 오기 전의 캐릭터. 섬 위에 설 자리와 똑같은 곳에 선다 */}
      <div
        ref={standIn}
        aria-hidden
        className="pointer-events-none absolute left-1/2 transition-opacity duration-500"
        style={{
          top: `${footRatio() * 100}%`,
          transform: `translate(-50%, -${(1 - ISLAND.feet) * 100}%)`,
        }}
      >
        <LevelBuddy stage={stage} cheer={cheer} size={mascotSize} />
      </div>
    </div>
  );
}

/**
 * 서 있는 캐릭터를 그림 한 장으로. 섬 위에 세울 종이 인형이다.
 *
 * 레벨 그림 파일이 있으면 그 파일을, 아직이면 코드로 그린 SVG 를 옮겨 그린다.
 * SVG 안의 색은 CSS 변수라 그림 파일 안에서는 풀리지 않는다 — 값으로 바꿔 넣는다.
 */
export async function mascotImage(stand: HTMLElement): Promise<HTMLImageElement | null> {
  const img = stand.querySelector("img");
  if (img) return load(img.src);

  const svg = stand.querySelector("svg");
  if (!svg) return null;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  // 크게 옮겨 그려야 폰 화면에서 흐리지 않다
  copy.setAttribute("width", "512");
  copy.setAttribute("height", "512");
  const css = getComputedStyle(document.documentElement);
  const markup = new XMLSerializer()
    .serializeToString(copy)
    .replace(
      /var\((--[\w-]+)\)/g,
      (_, name: string) => css.getPropertyValue(name).trim() || "#000",
    );
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    return await load(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function load(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
