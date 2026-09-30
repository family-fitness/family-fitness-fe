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
 * 묶음이 작으면 둘 다 절반까지만 — 다섯 집에 셋 · 셋이면 3등이 올라가면서 내려간다.
 */
export function zoneOf(
  rank: number,
  groupSize: number,
  promote: number,
  demote: number,
): "up" | "down" | "stay" {
  const half = Math.floor(groupSize / 2);
  const up = Math.min(promote, half);
  const down = Math.min(demote, half);
  if (rank >= 1 && rank <= up) return "up";
  if (down > 0 && rank > groupSize - down) return "down";
  return "stay";
}

/**
 * 순위 점수(0~1) — BE `AchievementRate` 와 같은 셈이다.
 * 달성률만으로 줄을 세우면 하루만 해낸 가족이 100% 로 1등이 된다. 그래서 운동한 날 수에 로그를 씌워 곱한다.
 *
 *   점수 = 달성률(0~1) × ln(1 + 운동한 날) ÷ ln(1 + 지난 날)   (지난 날마다 다 해내면 1)
 *
 * 화면은 서버가 준 점수로 줄을 세운다. 이 함수는 목 데이터가 같은 점수를 내는 데 쓴다.
 */
export function leagueScore(rate: number, doneDays: number, elapsedDays: number): number {
  if (elapsedDays <= 0) return 0;
  const score = (rate * Math.log1p(doneDays)) / Math.log1p(elapsedDays);
  return Math.round(Math.min(1, score) * 10_000) / 10_000;
}

/** 줄을 세우는 값 — 서버가 준 점수, 점수가 없는 옛 응답이면 달성률 */
function rankValue(s: { rate: number | null; score?: number | null }): number | null {
  return s.score !== undefined ? s.score : s.rate;
}

/**
 * i 번째 줄의 등수(1부터) — 서버의 rank 와 같은 셈이다. 나보다 점수가 높은 집 수 + 1, 같으면 같은 등수.
 * 셀 날이 없는 집(점수 null)은 등수가 없다.
 */
export function placeAt(
  standings: readonly { rate: number | null; score?: number | null }[],
  i: number,
): number | null {
  const row = standings[i];
  const mine = row ? rankValue(row) : null;
  if (mine == null) return null;
  return (
    standings.filter((x) => {
      const v = rankValue(x);
      return v != null && v > mine;
    }).length + 1
  );
}
