"use client";

import { ArtIcon } from "@/components/ui/art-icon";
import { LevelBuddy } from "@/components/domain/level-buddy";
import type { AchievementView, LeagueTier, ProgressView } from "@/lib/api/types";
import { artFor } from "@/lib/art";
import { tierArt, tierName } from "@/lib/league";
import { badgeArt, stageOf } from "@/lib/levels";

/** 이 레벨부터 키움이가 만세를 한다 — 높은 레벨의 프로필이 더 신나 보이게 */
const CHEER_FROM = 5;

/**
 * 리그의 우리 가족 프로필(9/25 「레벨이 높고 업적을 많이 달성했을 때 리그에서 보이는 자신의 프로필이 화려했으면 —
 * 업적도 그림도 쭉 걸어 놓고 레벨 이런 것도 있고」).
 *
 * 티어 메달 · 가족 이름 · 몇 등, 아이마다 레벨 단계대로 자란 키움이와 「Lv.N」(높은 레벨은 만세),
 * 가족이 얻은 업적 그림을 한 줄로 쭉 걸어 둔다. 레벨이 오르고 업적이 쌓일수록 캐릭터가 자라고 걸린 메달이 늘어
 * 프로필이 화려해진다 — 레벨 · 업적은 한 만큼 쌓이고 줄지 않는다(규칙 10).
 * 업적은 가족 것으로 모아 걸고 누가 얻었는지 가르지 않는다. 아이는 등록한 차례로 선다(규칙 14 · 형제 비교 아님).
 */
export function FamilyProfile({
  familyName,
  tier,
  place,
  meta,
  kids,
  progresses,
}: {
  familyName: string;
  tier: LeagueTier;
  /** 「10가족 중 3등」 · 「아직 순위가 없어요」 */
  place: string;
  /** 「2026년 9월 · 5일 남음」 */
  meta: string;
  kids: { profileId?: string | null; name?: string | null }[];
  /** `kids` 와 같은 차례 */
  progresses: (ProgressView | undefined)[];
}) {
  const medal = tierArt(tier);
  // 가족이 얻은 업적 — 같은 업적은 한 번, 먼저 얻은 차례로
  const earned = new Map<string, AchievementView>();
  for (const p of progresses) {
    for (const a of p?.achievements ?? []) {
      if (!a.earnedAt) continue;
      const had = earned.get(a.code);
      if (!had || Date.parse(a.earnedAt) < Date.parse(had.earnedAt ?? "")) earned.set(a.code, a);
    }
  }
  const badges = [...earned.values()].sort(
    (x, y) => Date.parse(x.earnedAt ?? "") - Date.parse(y.earnedAt ?? ""),
  );
  const kinds = progresses.find((p) => p)?.achievements.length ?? 0;

  return (
    <section className="card-hero" aria-label={`${familyName} 프로필`}>
      <p className="metric-label">{meta}</p>
      <div className="mt-2 flex items-center gap-4">
        {artFor(medal) && <ArtIcon name={medal} className="size-20" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-metric truncate leading-tight font-extrabold">{familyName}</h2>
          <p className="text-signal-deep text-body mt-0.5 font-extrabold">
            {tierName(tier)} 리그 · {place}
          </p>
        </div>
      </div>

      {/* 아이마다 — 레벨 단계대로 자란 키움이. 높은 레벨은 만세 */}
      {kids.length > 0 && (
        <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3">
          {kids.map((kid, i) => {
            const p = progresses[i];
            const level = p?.level ?? 1;
            return (
              <li key={kid.profileId ?? i} className="flex w-20 flex-col items-center text-center">
                <LevelBuddy
                  stage={stageOf(level).stage}
                  size={76}
                  cheer={level >= CHEER_FROM}
                  label={`${kid.name ?? "아이"} Lv.${level}`}
                />
                <span className="mt-1 max-w-full truncate text-sm font-extrabold">{kid.name}</span>
                <span className="text-signal-deep text-caption font-extrabold">
                  {p ? `Lv.${level}` : " "}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* 업적 — 얻은 그림을 쭉 걸어 둔다. 많이 얻을수록 줄이 길어진다 */}
      {badges.length > 0 && (
        <div className="border-line mt-4 border-t pt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-extrabold">업적</p>
            {kinds > 0 && (
              <p className="text-caption text-ink-soft font-bold tabular-nums">
                {badges.length} / {kinds}
              </p>
            )}
          </div>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label={`얻은 업적 ${badges.length}개`}>
            {badges.map((b) => (
              <li key={b.code} title={b.title}>
                <ArtIcon name={badgeArt(b.code)} className="size-12" />
                <span className="sr-only">{b.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
