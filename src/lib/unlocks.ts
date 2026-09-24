/**
 * 레벨마다 열리는 것 — 섬 꾸미기가 한 레벨에 하나씩.
 *
 * 레벨은 서버가 센다. 여기서는 **몇 레벨에 무엇이 열리는지**만 정한다.
 * 레벨은 한 만큼 오르고 내려가지 않으니(규칙 10), 한 번 열린 것은 닫히지 않는다.
 *
 * 열리는 건 전부 **덤**이다. 오늘 운동 · 캘린더 · 칭찬처럼 서비스의 본 기능은 레벨로 막지 않는다.
 * 놀이터(얼음땡 · 따라 해 봐)는 뺐다(9/25) — 그 자리를 섬 장식이 한 칸씩 당겨 채운다.
 */

export type DecorationId = "flag" | "fence" | "pond" | "tent" | "windmill" | "lighthouse";

export interface Unlock {
  id: DecorationId;
  level: number;
  name: string;
}

/** 레벨 차례. Lv.1 은 시작이라 열 것이 없고, Lv.2 부터 한 레벨에 하나 */
export const UNLOCKS: readonly Unlock[] = [
  { id: "flag", level: 2, name: "깃발" },
  { id: "fence", level: 3, name: "울타리" },
  { id: "pond", level: 4, name: "연못" },
  { id: "tent", level: 5, name: "텐트" },
  { id: "windmill", level: 6, name: "풍차" },
  { id: "lighthouse", level: 7, name: "등대" },
];

/** 이 레벨까지 열린 것 */
export function unlockedAt(level: number | null | undefined): Unlock[] {
  const lv = Math.max(1, level ?? 1);
  return UNLOCKS.filter((u) => u.level <= lv);
}

/** 다음에 열릴 것. 다 열렸으면 null */
export function nextUnlock(level: number | null | undefined): Unlock | null {
  const lv = Math.max(1, level ?? 1);
  return UNLOCKS.find((u) => u.level > lv) ?? null;
}

/** 섬에 세울 장식 */
export function decorationsAt(level: number | null | undefined): DecorationId[] {
  return unlockedAt(level).map((u) => u.id);
}

/** 방금 레벨이 오르며 새로 열린 것. 오르지 않았으면 빈 목록 */
export function newlyUnlocked(before: number | null, after: number | null | undefined): Unlock[] {
  if (before == null || after == null || after <= before) return [];
  return UNLOCKS.filter((u) => u.level > before && u.level <= after);
}
