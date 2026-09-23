"use client";

import { ArtIcon } from "@/components/ui/art-icon";
import { Card, CardHead } from "@/components/ui/card";
import { StickerArt } from "@/components/domain/sticker-art";
import type { AchievementView, CheerLog } from "@/lib/api/types";
import { badgeArt } from "@/lib/levels";
import { stickerOf } from "@/lib/stickers";

/**
 * 아이 홈 — 받은 스티커 최근 셋. 누르면 캘린더.
 *
 * 개수를 세지 않는다. 「스티커 12장」 을 걸면 모아야 할 것이 되고, 못 받은 날이 실패가 된다.
 */
export function RecentStickers({
  cheers,
  nameOf,
}: {
  cheers: CheerLog[] | undefined;
  /** 보낸 사람을 부르는 말 — 아이에게는 엄마 · 아빠 */
  nameOf: (profileId: string, fallback: string) => string;
}) {
  const recent = (cheers ?? [])
    .filter((c) => stickerOf(c.stickerId))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 3);

  return (
    <Card href="/calendar" label="받은 스티커 · 캘린더 보기">
      <CardHead title="받은 스티커" chevron />
      {recent.length === 0 ? (
        <p className="text-ink-soft mt-1 text-sm">엄마 · 아빠가 붙여 주면 여기에 모여요</p>
      ) : (
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {recent.map((c) => (
            <li key={c.cheerId} className="bg-sub flex flex-col items-center gap-1 rounded-2xl p-2">
              <StickerArt id={c.stickerId} className="size-12" />
              <span className="text-micro text-ink-soft truncate font-bold">
                {nameOf(c.fromProfileId, c.fromName)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 아이 홈 — 받은 업적 최근 셋. 누르면 레벨과 업적 */
export function RecentBadges({ achievements }: { achievements: AchievementView[] | undefined }) {
  const recent = (achievements ?? [])
    .filter((a) => a.earnedAt)
    .sort((a, b) => Date.parse(b.earnedAt ?? "") - Date.parse(a.earnedAt ?? ""))
    .slice(0, 3);

  return (
    <Card href="/kid/badges" label="업적 · 레벨과 업적 보기">
      <CardHead title="업적" chevron />
      {recent.length === 0 ? (
        <p className="text-ink-soft mt-1 text-sm">운동 한 칸을 끝내면 첫 업적이 생겨요</p>
      ) : (
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {recent.map((a) => (
            <li key={a.code} className="bg-sub flex flex-col items-center gap-1 rounded-2xl p-2">
              <ArtIcon name={badgeArt(a.code)} className="size-12" />
              <span className="text-micro truncate font-bold">{a.title}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
