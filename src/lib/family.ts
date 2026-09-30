import type { ProfileWithSex } from "./api/types";

/** 누구인지 모르거나 여럿을 한꺼번에 부를 때의 말 */
export const GUARDIAN = "보호자";

/**
 * 가족 한 사람을 부르는 말.
 *
 * 아이 화면에서도 보호자를 「엄마」 · 「아빠」 로 부르지 않는다 — 할머니 · 삼촌 · 한부모 가족도 쓴다.
 * 특정 보호자 한 사람이면 그 사람의 프로필 이름, 누구인지 모르면 넘겨받은 이름, 그것도 없으면 「보호자」.
 */
export function callName(
  person: Pick<ProfileWithSex, "name"> | undefined,
  fallback?: string | null,
): string {
  return person?.name || fallback || GUARDIAN;
}

/** 보호자 여럿에게 한꺼번에 갈 때 — 한 사람뿐이면 그 사람 이름, 여럿이거나 없으면 「보호자」 */
export function guardiansName(parents: Pick<ProfileWithSex, "name">[]): string {
  return parents.length === 1 ? callName(parents[0]) : GUARDIAN;
}
