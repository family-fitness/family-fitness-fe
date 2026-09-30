"use client";

import { useSyncExternalStore } from "react";

import { artFor } from "@/lib/art";
import { poseArt, type Pose } from "@/lib/poses";
import { cn } from "@/lib/utils";

/**
 * 데스크톱 옆 빈자리 배너 — 폰 너비 화면 양옆 거터에만 선다(9/30 「사이트 옆 빈 공간에 배너」).
 *
 * 판 하나를 키움이들이 둘러싸고 운동하고 논다. 운동하는 동작 그림(`pose/kiumi-*`)이 들어오면
 * 그 자리에 서고, 오기 전에는 레벨 캐릭터(서 있기 · 만세)가 선다. 꾸밈이라 읽지 않는다(aria-hidden).
 * 좁은 화면에는 없다 — 거터가 없으면 앱 화면을 가린다. 움직이지 않는다(AGENTS 「움직임」).
 */

/** 거터가 판을 세울 만큼 넓은 화면 */
const WIDE = "(min-width: 1240px)";
const onWideChange = (notify: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

/** 동작 그림이 있으면 그것, 없으면 레벨 캐릭터 */
function kiumi(pose: Pose, fallback: string) {
  return poseArt(pose) ?? artFor(fallback);
}

function Art({ name, className }: { name: string | null; className: string }) {
  if (!name) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 꾸밈 그림 몇 장이다. 최적화 요청보다 그대로가 가볍다
    <img src={`/assets/${name}.png`} alt="" className={cn("absolute object-contain", className)} />
  );
}

const FACTORS = [
  { name: "심폐지구력", art: "icon/factor-cardio" },
  { name: "근력", art: "icon/factor-strength" },
  { name: "근지구력", art: "icon/factor-endurance" },
  { name: "유연성", art: "icon/factor-flexibility" },
  { name: "순발력", art: "icon/factor-power" },
  { name: "민첩성", art: "icon/factor-agility" },
];

export function DesktopBanner() {
  /*
    넓은 화면에서만 그린다(서버는 늘 안 그린다). 숨긴 채 그렸더니 폰에서도 그림 18장(551KB)을 받고, React 가 그림마다
    미리 받기(preload)까지 걸어 폰의 첫 그림이 0.45초 늦었다(9/30 성능 점검)
  */
  const wide = useSyncExternalStore(
    onWideChange,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  if (!wide) return null;
  return (
    <>
      <aside
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 hidden w-[calc((100vw-var(--width-phone))/2)] place-items-center select-none min-[1240px]:grid"
      >
        <div className="relative w-64">
          <div className="border-signal-soft bg-paper shadow-lift rounded-[28px] border-2 px-7 pt-14 pb-24 text-center">
            <p className="text-signal-strong text-lg font-extrabold">우리가족</p>
            <p className="text-signal-deep mt-1 text-[2.1rem] leading-none font-extrabold">
              체력키움
            </p>
            {/* 이름만 — 「…그리는 우리 가족 체력 지도」 같은 소개 줄은 설명 문구다(앱 정보에서도 걷었다) */}
            <p className="text-ink-soft mt-4 text-sm font-semibold">국민체력100</p>
          </div>
          <Art
            name={kiumi("jumprope", "level/level-5-cheer")}
            className="-top-16 -left-8 size-28"
          />
          <Art name={kiumi("wave", "level/level-3")} className="-top-12 -right-6 size-24" />
          <Art name={kiumi("run", "level/level-2")} className="-bottom-10 -left-10 size-28" />
          <Art name={kiumi("ball", "level/level-4-cheer")} className="right-2 -bottom-12 size-28" />
          <Art name={artFor("sticker/sticker-star")} className="top-3 -right-10 size-10" />
          <Art name={artFor("sticker/sticker-heart")} className="bottom-24 -left-12 size-9" />
          <Art name={artFor("sticker/sticker-sparkle")} className="bottom-8 left-1/2 size-8" />
        </div>
      </aside>

      <aside
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 hidden w-[calc((100vw-var(--width-phone))/2)] place-items-center select-none min-[1240px]:grid"
      >
        <div className="relative w-64">
          <div className="border-signal-soft bg-paper shadow-lift rounded-[28px] border-2 px-6 pt-8 pb-20">
            <p className="text-signal-deep text-center text-lg font-extrabold">여섯 가지 체력</p>
            <ul className="mt-5 grid grid-cols-3 gap-x-2 gap-y-4">
              {FACTORS.map((f) => {
                const art = artFor(f.art);
                return (
                  <li key={f.name} className="flex flex-col items-center gap-1">
                    {art && (
                      // eslint-disable-next-line @next/next/no-img-element -- 꾸밈 그림
                      <img src={`/assets/${art}.png`} alt="" className="size-11 object-contain" />
                    )}
                    <span className="text-ink-soft text-xs font-bold">{f.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <Art name={kiumi("stretch", "level/level-4")} className="-top-14 -right-8 size-28" />
          <Art name={kiumi("jump", "level/level-1-cheer")} className="-bottom-12 -left-8 size-28" />
          <Art name={kiumi("squat", "level/level-5")} className="-right-9 -bottom-10 size-28" />
          <Art name={artFor("sticker/sticker-medal")} className="top-6 -left-11 size-10" />
          <Art name={artFor("sticker/sticker-sun")} className="-right-12 bottom-28 size-9" />
        </div>
      </aside>
    </>
  );
}
