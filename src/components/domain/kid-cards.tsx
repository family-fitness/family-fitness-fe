"use client";

import { ArtIcon } from "@/components/ui/art-icon";
import { Card, CardHead } from "@/components/ui/card";
import { StickerArt } from "@/components/domain/sticker-art";
import type { AchievementView, CheerLog } from "@/lib/api/types";
import { badgeArt } from "@/lib/levels";
import { stickerOf } from "@/lib/stickers";
import { formatDate } from "@/lib/utils";

/**
 * 아이 홈 — 받은 스티커 최근 셋. 누르면 캘린더.
 *
 * **받은 말**의 모양이다 — 누가 · 무슨 말을 · 언제. 업적(모은 것)과 같은 칸 판으로 두었더니
 * 둘이 같은 것처럼 보였다. 스티커는 줄, 업적은 칸.
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
        <p className="text-ink-soft mt-1 text-sm">아직 없어요</p>
      ) : (
        <ul className="divide-rows mt-1">
          {recent.map((c) => (
            <li key={c.cheerId} className="flex items-center gap-3 py-2.5">
              <StickerArt id={c.stickerId} className="size-12 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">
                  {stickerOf(c.stickerId)?.label}
                </span>
                <span className="text-caption text-ink-soft block font-bold">
                  {nameOf(c.fromProfileId, c.fromName)} · {formatDate(c.createdAt)}
                </span>
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
        <p className="text-ink-soft mt-1 text-sm">아직 없어요</p>
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
