"use client";

import { useEffect, useRef, useState } from "react";

import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

/**
 * 또래 무리 속 내 자리.
 *
 * 전에는 원형 링과 가로 막대가 같은 숫자를 두 번 말하고 있었다. 둘 다 "51" 을
 * 그리는데 51 이 무슨 뜻인지는 어느 쪽도 말해 주지 못했다.
 *
 * 여기서는 **또래 100명을 점 100개로 실제로 그린다.** 내 점 하나가 그 무리 안
 * 어디에 있는지가 곧 답이다. 점을 세서 등수를 읽을 수 없게 세로로 흩어 두었다 —
 * 아이 화면에서 순위로 바뀌면 안 되기 때문이다(도메인 규칙 10).
 *
 * three.js 를 쓰는 이유는 100개가 **동시에** 자리를 잡기 때문이다. DOM 으로 100개를
 * 같이 움직이면 모바일에서 프레임이 떨어진다. 자리를 잡고 나면 멈춘다.
 */

/** 또래 수. 백분위가 100분위라 100개가 맞다 */
const PEERS = 100;

export function PeerCloud({
  score,
  label = "또래 100명 중 내 자리",
  tone = "parent",
  className,
}: {
  /** 0~100 백분위. 측정 기록이 없으면 null */
  score: number | null | undefined;
  label?: string;
  tone?: "parent" | "kid";
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const kid = tone === "kid";

  useEffect(() => {
    const el = host.current;
    if (!el || score == null) return;

    let disposed = false;
    let stop = () => {};

    void (async () => {
      const THREE = await import("three");
      if (disposed || !el) return;

      const width = el.clientWidth || 320;
      const height = el.clientHeight || 140;
      const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

      const scene = new THREE.Scene();
      // 정사영. 원근도 그림자도 없다 — 에셋이 플랫 2D 라 입체를 섞으면 따로 논다
      const camera = new THREE.OrthographicCamera(0, width, height, 0, -100, 100);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearAlpha(0);
      el.appendChild(renderer.domElement);

      /** 점 하나를 캔버스로 그려 텍스처로 쓴다. 에셋을 기다리지 않아도 된다 */
      const dot = (fill: string, ring?: string) => {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - (ring ? 6 : 2), 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        if (ring) {
          ctx.lineWidth = 6;
          ctx.strokeStyle = ring;
          ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };

      const peerTexture = dot("#d6dde8");
      const meTexture = dot("#2784e6", "#1b2574");
      if (!peerTexture || !meTexture) return;

      const inset = kid ? 22 : 16;
      const span = width - inset * 2;
      const peerSize = kid ? 11 : 9;
      const meSize = kid ? 26 : 20;

      interface Piece {
        sprite: InstanceType<typeof THREE.Sprite>;
        toY: number;
        fromY: number;
        delay: number;
      }
      const pieces: Piece[] = [];

      /*
        자리는 **정해진 값으로** 잡는다. Math.random 을 쓰면 새로고침할 때마다
        무리 모양이 바뀌어서, 같은 점수인데 다른 그림이 뜬다 — 고장 난 것처럼 보인다.
        번호에서 0~1 을 뽑아 쓰면 언제 봐도 같은 그림이다.
      */
      const scatter = (i: number, salt: number) => {
        const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
        return v - Math.floor(v);
      };

      /* 또래 100명. x 는 백분위라 고르게 퍼지고, y 는 흩어 둔다 —
         한 줄로 세우면 그 순간 등수표가 된다 */
      const rows = kid ? 5 : 4;
      for (let i = 0; i < PEERS; i += 1) {
        const material = new THREE.SpriteMaterial({ map: peerTexture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(peerSize, peerSize, 1);
        const toX = inset + ((i + 0.5) / PEERS) * span;
        /* 줄을 나눠 놓고 줄 안에서만 흔든다. 완전히 무작위로 두면 뭉친 곳과
           빈 곳이 생겨서 무리가 두 덩어리로 갈라져 보인다 */
        const row = i % rows;
        const band = height * 0.46;
        const toY =
          height / 2 -
          band / 2 +
          (band * (row + 0.5)) / rows +
          (scatter(i, 1) - 0.5) * (band / rows);
        sprite.position.set(toX, still ? toY : height + 30, 0);
        scene.add(sprite);
        pieces.push({ sprite, toY, fromY: height + 30, delay: scatter(i, 2) * 0.45 });
      }

      /* 내 점. 마지막에 자리를 잡는다 */
      const meMaterial = new THREE.SpriteMaterial({ map: meTexture, transparent: true });
      const me = new THREE.Sprite(meMaterial);
      me.scale.set(meSize, meSize, 1);
      const meX = inset + (score / 100) * span;
      me.position.set(meX, still ? height / 2 : height + 40, 1);
      scene.add(me);

      renderer.render(scene, camera);
      setDrawn(true);

      if (still) {
        stop = () => {
          renderer.dispose();
          renderer.domElement.remove();
        };
        return;
      }

      /* 화면 밖에 있으면 그리지 않는다. 배터리를 계속 먹으면 안 된다 */
      let visible = true;
      const watcher = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
        },
        { threshold: 0 },
      );
      watcher.observe(el);

      const started = performance.now();
      const SETTLE = 900;
      let raf = 0;

      const ease = (t: number) => 1 - Math.pow(1 - t, 3);

      const frame = (now: number) => {
        const elapsed = (now - started) / 1000;
        let moving = false;

        if (visible) {
          for (const p of pieces) {
            const t = Math.min(1, Math.max(0, (elapsed - p.delay) / (SETTLE / 1000)));
            if (t < 1) moving = true;
            p.sprite.position.y = p.fromY + (p.toY - p.fromY) * ease(t);
          }
          const mt = Math.min(1, Math.max(0, (elapsed - 0.5) / (SETTLE / 1000)));
          if (mt < 1) moving = true;
          me.position.y = height + 40 + (height / 2 - (height + 40)) * ease(mt);
          renderer.render(scene, camera);
        } else {
          moving = true; // 다시 보일 때까지 기다린다
        }

        if (moving) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      stop = () => {
        cancelAnimationFrame(raf);
        watcher.disconnect();
        peerTexture.dispose();
        meTexture.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      stop();
    };
  }, [score, kid]);

  if (score == null) return null;

  return (
    <figure className={cn("w-full", className)}>
      <div
        ref={host}
        className="relative w-full"
        style={{ height: kid ? 168 : 132 }}
        role="img"
        aria-label={`또래 100명 가운데 ${score}번째 자리예요`}
      >
        {/* 또래 평균 눈금. 기준이 없으면 점 하나가 어디인지 알 수 없다 */}
        <span
          className="bg-line pointer-events-none absolute top-2 bottom-6 left-1/2 w-px -translate-x-1/2"
          aria-hidden
        />
        <span
          className="text-faint text-micro pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 font-bold"
          aria-hidden
        >
          또래 평균
        </span>
        {/* 그림이 뜨기 전 자리를 잡아 둔다. 안 그러면 화면이 한 번 튄다 */}
        {!drawn && <span className="bg-sub/60 absolute inset-x-0 top-1/2 h-14 -translate-y-1/2" />}
      </div>

      <figcaption className="mt-1 flex items-baseline justify-between gap-2">
        <span className={cn("font-extrabold", kid ? "text-lg" : "text-body")}>{label}</span>
        {/* 점이 자리를 잡는 동안 숫자도 같이 오른다. 숫자만 툭 뜨면 둘이 따로 논다 */}
        <span
          className={cn(
            "board-num text-signal-deep leading-none",
            kid ? "text-[2.4rem]" : "text-3xl",
          )}
        >
          <CountUp to={score} duration={1400} />
        </span>
      </figcaption>
    </figure>
  );
}
