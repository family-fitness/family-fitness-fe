"use client";

import { useEffect, useRef, useState } from "react";
import type * as T from "three";

import { cn } from "@/lib/utils";

import { useToonScene, type CameraSpec } from "./use-toon-scene";

/**
 * 운동 주사위 — 섬 판 위의 입체 주사위. 면마다 동작 하나가 적혀 있다.
 *
 * 굴리면 한 번 튀어 오르며 구르다가 **윗면**에 나온 동작으로 멈춘다(진짜 주사위처럼).
 * 무엇이 나올지는 화면이 먼저 정하고(`roll.face`), 주사위는 그 면이 위로 오게 구른다.
 * 윗면 글자가 이쪽에서 똑바로 읽히게 멈춘다. 나온 동작은 아래 글자로도 크게 나온다.
 *
 * 움직임 줄이기면 구르지 않고 그 면으로 바로 바뀐다.
 */
const CAMERA: CameraSpec = { elevation: 46, azimuth: 30, target: 0.6, view: 1.55 };
const SIZE = 1.2;
/** 구르는 시간(초) */
const ROLL = 1.25;
/**
 * 화면이 「멈췄다」 고 볼 때까지(밀리초). 입체가 못 오거나(WebGL 없음) 늦게 와도
 * 굴린 결과는 이만큼 뒤에 나온다 — 주사위를 기다리다 놀이가 멈추면 안 된다
 */
export const DICE_SETTLE_MS = ROLL * 1000 + 700;

/** 박스 면 차례(+x −x +y −y +z −z)마다 글자의 오른쪽 · 위 방향. three 의 BoxGeometry 가 UV 를 까는 방향이다 */
const FACE_AXES: [T.Vector3Tuple, T.Vector3Tuple, T.Vector3Tuple][] = [
  [
    [0, 0, -1],
    [0, 1, 0],
    [1, 0, 0],
  ],
  [
    [0, 0, 1],
    [0, 1, 0],
    [-1, 0, 0],
  ],
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ],
  [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  [
    [-1, 0, 0],
    [0, 1, 0],
    [0, 0, -1],
  ],
];

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** 섬과 같은 두 톤 — 빛을 등진 면은 한 단계 어둡게. 글자가 있는 면이라 그림을 받는다 */
const FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 light;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(map, vUv).rgb;
    float d = dot(normalize(vNormal), light);
    gl_FragColor = vec4(d > 0.12 ? c : c * 0.86, 1.0);
    #include <colorspace_fragment>
  }
`;

export function MoveDice({
  faces,
  roll,
  onLanded,
  onTap,
  height = 260,
  className,
}: {
  /** 여섯 면 — 이름 · 몇 번 */
  faces: readonly { name: string; amount: string }[];
  /** 굴린 차례와 나올 면. 차례가 바뀔 때마다 한 번 구른다 */
  roll: { n: number; face: number } | null;
  onLanded?: (face: number) => void;
  /** 주사위를 톡 — 굴리기와 같다 */
  onTap?: () => void;
  height?: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const live = useRef({ roll, onLanded, onTap });
  useEffect(() => {
    live.current = { roll, onLanded, onTap };
  });

  const wake = useToonScene(
    host,
    CAMERA,
    ({ THREE, addons, kit, palette, scene, camera, still, invalidate }) => {
      const { keep, toon, solid } = kit;
      const light = new THREE.Vector3(-0.55, 0.72, 0.42)
        .normalize()
        .transformDirection(camera.matrixWorld);

      /* 판 — 섬처럼 흰 윗면 · 파란 띠 */
      const slab = new THREE.CylinderGeometry(1.38, 1.38, 0.26, 6);
      slab.translate(0, -0.13, 0);
      const band = toon(palette.band, palette.bandShade, true);
      scene.add(solid(slab, [band, toon(palette.top, palette.topShade, true), band]));
      const edge = keep(
        new addons.LineMaterial({ color: new THREE.Color(palette.line).getHex(), linewidth: 2 }),
      );
      scene.add(
        new addons.LineSegments2(
          keep(
            new addons.LineSegmentsGeometry().fromEdgesGeometry(
              keep(new THREE.EdgesGeometry(slab, 25)),
            ),
          ),
          edge,
        ),
      );

      /* 면 그림 — 흰 바탕에 파란 테, 남색 이름 · 파랑 횟수 */
      const paint = (c: HTMLCanvasElement, name: string, amount: string) => {
        const g = c.getContext("2d");
        if (!g) return;
        const font = getComputedStyle(document.body).fontFamily;
        g.fillStyle = palette.white;
        g.fillRect(0, 0, 512, 512);
        g.strokeStyle = palette.base;
        g.lineWidth = 28;
        g.strokeRect(34, 34, 444, 444);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = palette.line;
        // 긴 이름은 두 줄로
        const words = name.split(" ");
        const lines =
          words.length > 1 && name.length > 5
            ? [words.slice(0, -1).join(" "), words.at(-1) ?? ""]
            : [name];
        g.font = `800 ${lines.length > 1 ? 74 : 84}px ${font}`;
        lines.forEach((line, i) =>
          g.fillText(line, 256, 206 + (i - (lines.length - 1) / 2) * 86, 420),
        );
        g.fillStyle = palette.blue;
        g.font = `800 68px ${font}`;
        g.fillText(amount, 256, 372, 420);
      };
      const painted = faces.map((f) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        paint(canvas, f.name, f.amount);
        const texture = keep(new THREE.CanvasTexture(canvas));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return { canvas, texture, face: f };
      });
      // 글꼴이 늦게 오면 한 번 더 그린다 — 기본 글꼴로 적힌 면이 남지 않게
      let gone = false;
      if (document.fonts && document.fonts.status !== "loaded") {
        void document.fonts.ready.then(() => {
          if (gone) return;
          for (const p of painted) {
            paint(p.canvas, p.face.name, p.face.amount);
            p.texture.needsUpdate = true;
          }
          invalidate();
        });
      }
      const materials = painted.map(({ texture }) =>
        keep(
          new THREE.ShaderMaterial({
            uniforms: { map: { value: texture }, light: { value: light } },
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          }),
        ),
      );
      const box = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
      const die = solid(box, materials);
      const dieEdges = new addons.LineSegments2(
        keep(
          new addons.LineSegmentsGeometry().fromEdgesGeometry(keep(new THREE.EdgesGeometry(box))),
        ),
        edge,
      );
      const body = new THREE.Group();
      body.add(die, dieEdges);
      scene.add(body);
      const rest = SIZE / 2;
      body.position.y = rest;

      /**
       * 그 면이 위로, 글자가 이쪽(카메라)에서 읽히게 놓는 돌림 — 글자 위쪽이 카메라 반대편.
       * 카메라와 딱 맞추면 앞면 하나만 보여 납작하다. 조금(28도) 비껴 세워 옆면까지 보이게 한다
       */
      const az = ((CAMERA.azimuth + 28) * Math.PI) / 180;
      const up = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)),
        new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az)),
        new THREE.Vector3(0, 1, 0),
      );
      const facing = (k: number) => {
        const [r, u, n] = FACE_AXES[k].map((v) => new THREE.Vector3(...v));
        const from = new THREE.Matrix4().makeBasis(r, u, n).transpose();
        return new THREE.Quaternion().setFromRotationMatrix(up.clone().multiply(from));
      };
      // 첫 면에서 시작한다. 입체가 오기 전에 굴렸으면(차례가 이미 있으면) 곧바로 그 면으로 구른다
      body.quaternion.copy(facing(0));

      let seenRoll = 0;
      let tumble: {
        from: T.Quaternion;
        to: T.Quaternion;
        axis: T.Vector3;
        at: number;
        face: number;
      } | null = null;
      const spin = new THREE.Quaternion();
      const mid = new THREE.Quaternion();

      return {
        busy: () => tumble != null,
        update(t) {
          const r = live.current.roll;
          if (r && r.n !== seenRoll) {
            seenRoll = r.n;
            if (still) {
              body.quaternion.copy(facing(r.face));
              live.current.onLanded?.(r.face);
            } else {
              // 가로로 누운 축 아무거나 — 앞뒤 · 옆으로 구른다
              const a = Math.random() * Math.PI * 2;
              tumble = {
                from: body.quaternion.clone(),
                to: facing(r.face),
                axis: new THREE.Vector3(Math.cos(a), 0.35, Math.sin(a)).normalize(),
                at: t,
                face: r.face,
              };
            }
          }
          if (!tumble) return;
          const k = Math.min(1, (t - tumble.at) / ROLL);
          const e = 1 - Math.pow(1 - k, 3);
          // 두 바퀴 반 구르다가 제 면으로 — 끝에서 돌림이 0 이 되어 딱 맞게 선다
          spin.setFromAxisAngle(tumble.axis, (1 - e) * Math.PI * 5);
          mid.slerpQuaternions(tumble.from, tumble.to, e);
          body.quaternion.multiplyQuaternions(spin, mid);
          // 한 번 크게 뜨고 작게 한 번 더 튄다
          const hop =
            k < 0.68
              ? 4 * (k / 0.68) * (1 - k / 0.68) * 0.8
              : 4 * ((k - 0.68) / 0.32) * (1 - (k - 0.68) / 0.32) * 0.16;
          body.position.y = rest + hop;
          if (k >= 1) {
            body.quaternion.copy(tumble.to);
            body.position.y = rest;
            const face = tumble.face;
            tumble = null;
            live.current.onLanded?.(face);
          }
        },
        tap() {
          if (!tumble) live.current.onTap?.();
        },
        resize(width, heightPx) {
          edge.resolution.set(width, heightPx);
        },
        dispose() {
          gone = true;
        },
      };
    },
    [faces.map((f) => f.name + f.amount).join()],
    setReady,
  );

  // 굴릴 차례가 오면 깨운다
  const rollKey = roll?.n ?? 0;
  useEffect(() => {
    if (rollKey) wake();
  }, [rollKey, wake]);

  // 입체가 오기 전 · WebGL 이 없을 때 — 납작한 주사위 한 면. 빈 칸이 먼저 뜨지 않게
  const shown = faces[roll?.face ?? 0];
  return (
    <div
      ref={host}
      aria-hidden
      className={cn("relative w-full touch-pan-y select-none", className)}
      style={{ height }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-300",
          ready && "opacity-0",
        )}
      >
        <div className="bg-paper border-signal-deep shadow-card grid size-28 place-items-center rounded-2xl border-4 px-2 text-center">
          <span className="text-sm leading-tight font-extrabold">
            {shown?.name}
            <span className="text-signal-strong mt-1 block">{shown?.amount}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
