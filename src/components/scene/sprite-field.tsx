"use client";

import { useEffect, useRef } from "react";
import type { Sprite, Texture } from "three";

/**
 * 우리 2D 에셋을 WebGL 스프라이트로 띄워 천천히 움직인다.
 *
 * 왜 three.js 인가
 *   CSS 로도 몇 개는 띄울 수 있지만, 조각 수십~수백 개를 동시에 움직이면
 *   레이아웃이 흔들리고 프레임이 떨어진다. WebGL 은 같은 그림을 한 번만 올려두고
 *   위치만 바꾸므로 개수가 늘어도 값이 거의 안 오른다.
 *
 * 왜 3D 모델이 아닌가
 *   에셋이 플랫 2D 벡터다. 여기에 입체를 섞으면 두 개의 다른 앱처럼 보인다.
 *   카메라를 정사영으로 두고 스프라이트만 쓴다 — 원근도 그림자도 없다.
 *
 * 지키는 것
 *   - 배경은 투명. 화면 색은 CSS 가 정한다
 *   - prefers-reduced-motion 이면 아예 그리지 않는다
 *   - 화면에서 벗어나면 멈춘다. 배터리를 계속 먹으면 안 된다
 */
export function SpriteField({
  assets,
  count = 12,
  speed = 1,
  burst = false,
  /** 0~1. 배경 장식은 낮게 둔다. 글자를 읽는 데 방해가 되면 장식이 아니라 잡음이다 */
  opacity = 0.16,
  /** 스프라이트 한 변의 픽셀 범위 */
  scale = [12, 26],
  className,
}: {
  /** "deco/deco-star" 처럼 분류/이름 */
  assets: string[];
  count?: number;
  speed?: number;
  /** true 면 아래에서 위로 한 번 터뜨리고 사라진다. 완료 연출용 */
  burst?: boolean;
  opacity?: number;
  scale?: [number, number];
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

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

      const scene = new THREE.Scene();
      // 정사영 카메라 — 원근이 없어야 플랫한 결이 유지된다
      const camera = new THREE.OrthographicCamera(0, width, height, 0, -100, 100);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearAlpha(0);
      host.appendChild(renderer.domElement);

      const loader = new THREE.TextureLoader();
      const textures = await Promise.all(
        assets.map(
          (name) =>
            new Promise<Texture | null>((resolve) => {
              loader.load(
                `/assets/${name}.png`,
                (texture) => {
                  texture.colorSpace = THREE.SRGBColorSpace;
                  resolve(texture);
                },
                undefined,
                () => resolve(null),
              );
            }),
        ),
      );
      const usable = textures.filter((t): t is Texture => t !== null);
      if (disposed || usable.length === 0) return;

      interface Piece {
        sprite: Sprite;
        vx: number;
        vy: number;
        spin: number;
      }

      const pieces: Piece[] = [];
      for (let i = 0; i < count; i += 1) {
        const texture = usable[i % usable.length];
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: burst ? 1 : opacity * (0.7 + Math.random() * 0.6),
          depthTest: false,
        });
        const sprite = new THREE.Sprite(material);
        const size = burst
          ? 18 + Math.random() * 16
          : scale[0] + Math.random() * (scale[1] - scale[0]);
        sprite.scale.set(size, size, 1);

        if (burst) {
          sprite.position.set(width / 2 + (Math.random() - 0.5) * width * 0.4, -20, 0);
          pieces.push({
            sprite,
            vx: (Math.random() - 0.5) * 2.6,
            vy: 3.4 + Math.random() * 3.2,
            spin: (Math.random() - 0.5) * 0.06,
          });
        } else {
          sprite.position.set(Math.random() * width, Math.random() * height, 0);
          pieces.push({
            sprite,
            vx: (Math.random() - 0.5) * 0.16 * speed,
            vy: (0.1 + Math.random() * 0.22) * speed,
            spin: 0,
          });
        }
        scene.add(sprite);
      }

      let frame = 0;
      let running = true;
      let elapsed = 0;

      const tick = () => {
        if (!running) return;
        frame = requestAnimationFrame(tick);
        elapsed += 1;

        for (const piece of pieces) {
          piece.sprite.position.x += piece.vx;
          piece.sprite.position.y += piece.vy;
          if (burst) {
            // 위로 솟았다가 천천히 떨어지고 흐려진다
            piece.vy -= 0.075;
            piece.sprite.material.opacity = Math.max(0, 1 - elapsed / 110);
          } else {
            // 흘러가듯 계속 돈다. 위로 나가면 아래에서 다시 들어온다
            if (piece.sprite.position.y > height + 40) {
              piece.sprite.position.y = -40;
              piece.sprite.position.x = Math.random() * width;
            }
            if (piece.sprite.position.x < -40) piece.sprite.position.x = width + 40;
            if (piece.sprite.position.x > width + 40) piece.sprite.position.x = -40;
          }
        }

        renderer.render(scene, camera);
        if (burst && elapsed > 120) running = false;
      };
      tick();

      // 화면 밖으로 나가면 멈춘다. 배터리를 계속 먹으면 안 된다
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !running && !burst) {
          running = true;
          tick();
        } else if (!entry.isIntersecting) {
          running = false;
          cancelAnimationFrame(frame);
        }
      });
      observer.observe(host);

      stop = () => {
        running = false;
        cancelAnimationFrame(frame);
        observer.disconnect();
        for (const piece of pieces) piece.sprite.material.dispose();
        for (const texture of usable) texture.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      stop();
    };
  }, [assets, count, speed, burst, opacity, scale]);

  return <div ref={hostRef} aria-hidden className={className} />;
}
