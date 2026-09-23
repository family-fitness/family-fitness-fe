import type { ProgressView } from "./api/types";

/**
 * 레벨 캐릭터 「키움이」 가 자라는 다섯 단계.
 *
 * 레벨 계산은 서버가 한다. 여기서는 **몇 단계 모습으로 그릴지**만 정한다 —
 * 레벨 둘마다 한 단계씩 자란다. 체력을 「키운다」 는 서비스 이름에서 온 모습이라
 * 씨앗에서 나무까지 식물처럼 자란다.
 */
export const STAGES = [
  { stage: 1, name: "씨앗 키움이", from: 1 },
  { stage: 2, name: "새싹 키움이", from: 3 },
  { stage: 3, name: "잎새 키움이", from: 5 },
  { stage: 4, name: "꽃 키움이", from: 7 },
  { stage: 5, name: "나무 키움이", from: 9 },
] as const;

export type Stage = (typeof STAGES)[number]["stage"];

export function stageOf(level: number | null | undefined): (typeof STAGES)[number] {
  const lv = Math.max(1, level ?? 1);
  return [...STAGES].reverse().find((s) => lv >= s.from) ?? STAGES[0];
}

/**
 * 이번 레벨 안에서 얼마나 왔나.
 *
 * 전체 경험치가 아니라 **이 레벨 구간 안의 비율**이다. 전체로 그리면 레벨이 오를수록
 * 막대가 더디게 차서, 많이 한 아이일수록 제자리처럼 보인다.
 */
export function levelProgress(p: Pick<ProgressView, "xp" | "levelFloorXp" | "nextLevelXp">): {
  ratio: number;
  left: number | null;
} {
  if (p.nextLevelXp == null) return { ratio: 1, left: null };
  const span = Math.max(1, p.nextLevelXp - p.levelFloorXp);
  const into = Math.max(0, p.xp - p.levelFloorXp);
  return { ratio: Math.min(1, into / span), left: Math.max(0, p.nextLevelXp - p.xp) };
}

/** 업적 코드의 배지 그림. `STREAK_3` → `badge/badge-streak-3` (ASSET_PROMPTS.md 3장) */
export function badgeArt(code: string): string {
  return `badge/badge-${code.toLowerCase().replace(/_/g, "-")}`;
}
