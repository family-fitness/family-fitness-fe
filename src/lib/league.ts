import type { LeagueTier } from "./api/types";

/**
 * 가족 리그의 티어 — 아래부터 브론즈 · 실버 · 골드 · 플래티넘 · 다이아(9/25).
 *
 * 한 달이 한 판이다. 달이 바뀌면 위 몇 집은 한 칸 올라가고 아래 몇 집은 한 칸 내려간다.
 * 겨루는 값은 체력이 아니라 목표 달성률이다 — 순위를 매기는 건 서버이고, 화면은 이름과 자리만 가른다.
 */
export const TIERS: readonly { id: LeagueTier; name: string }[] = [
  { id: "BRONZE", name: "브론즈" },
  { id: "SILVER", name: "실버" },
  { id: "GOLD", name: "골드" },
  { id: "PLATINUM", name: "플래티넘" },
  { id: "DIAMOND", name: "다이아" },
];

export function tierIndex(tier: LeagueTier): number {
  return TIERS.findIndex((t) => t.id === tier);
}

export function tierName(tier: LeagueTier): string {
  return TIERS[tierIndex(tier)]?.name ?? "";
}

/** 한 칸 위 티어. 다이아면 null */
export function nextTier(tier: LeagueTier): LeagueTier | null {
  return TIERS[tierIndex(tier) + 1]?.id ?? null;
}

/** 한 칸 아래 티어. 브론즈면 null */
export function prevTier(tier: LeagueTier): LeagueTier | null {
  const i = tierIndex(tier);
  return i > 0 ? TIERS[i - 1].id : null;
}

/** 티어 메달 그림 이름(주문서의 `league/tier-*`) */
export function tierArt(tier: LeagueTier): string {
  return `league/tier-${tier.toLowerCase()}`;
}

/**
 * 순위(1부터)가 달이 바뀔 때 어디로 가는 자리인가.
 * 위 `promote` 자리는 올라가고, 아래 `demote` 자리는 내려가고, 나머지는 그대로.
 */
export function zoneOf(
  rank: number,
  groupSize: number,
  promote: number,
  demote: number,
): "up" | "down" | "stay" {
  if (rank >= 1 && rank <= promote) return "up";
  if (demote > 0 && rank > groupSize - demote) return "down";
  return "stay";
}
