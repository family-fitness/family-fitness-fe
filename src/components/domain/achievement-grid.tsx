"use client";

import { useState } from "react";

import { ArtIcon } from "@/components/ui/art-icon";
import { Sheet } from "@/components/ui/sheet";
import { KiumMedal } from "@/components/scene/kium-medal";
import type { AchievementView } from "@/lib/api/types";
import { artFor } from "@/lib/art";
import { badgeArt } from "@/lib/levels";
import { dayOf } from "@/lib/today";
import { cn, formatDate } from "@/lib/utils";

/**
 * 업적 격자 — 어떤 업적이 있는지 한눈에. 받은 것은 색, 아직인 것은 회색.
 * 누르면 메달이 한 바퀴 반 돌며 나타나고(three.js), 아직인 것은 어떻게 얻는지를 적는다 —
 * 못 한 것이 아니라 아직인 것이다. 아이 업적 화면과 부모의 아이 기록이 같이 쓴다(9/25).
 */
export function AchievementGrid({ achievements }: { achievements: AchievementView[] }) {
  const [open, setOpen] = useState<AchievementView | null>(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {achievements.map((a) => {
          const got = Boolean(a.earnedAt);
          return (
            <li key={a.code}>
              <button
                type="button"
                onClick={() => setOpen(a)}
                className="press bg-sub flex w-full flex-col items-center gap-1.5 rounded-2xl px-1.5 py-3"
                aria-label={`${a.title}${got ? " · 받았어요" : " · 아직"}`}
              >
                <ArtIcon
                  name={badgeArt(a.code)}
                  className={cn("size-12", !got && "opacity-30 grayscale")}
                />
                <span
                  className={cn(
                    "text-micro text-center leading-tight font-bold",
                    !got && "text-ink-soft",
                  )}
                >
                  {a.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} title={open?.title}>
        {open && (
          <div className="flex flex-col items-center pb-2 text-center">
            {open.earnedAt ? (
              <KiumMedal
                art={artFor(badgeArt(open.code))}
                size={220}
                label={`${open.title} 메달`}
              />
            ) : (
              <ArtIcon name={badgeArt(open.code)} className="my-8 size-28 opacity-30 grayscale" />
            )}
            <p className="text-body mt-2 font-bold">{open.description}</p>
            <p className="text-caption text-ink-soft mt-1 font-semibold">
              {open.earnedAt ? `${formatDate(dayOf(open.earnedAt))}에 받았어요` : "아직이에요"}
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}
