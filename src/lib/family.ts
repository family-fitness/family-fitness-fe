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

/** 아이 없는 가족을 아이 등록으로 보낼 때 알리는 한 줄 */
export const NEED_CHILD_COPY = "아이와 함께 쓰는 서비스예요. 아이를 먼저 등록해 주세요";

/**
 * 아이 등록으로 보내야 하나 — 우리 서비스는 아이와 함께 쓴다. 가족에 아이가 한 명도 없으면
 * 앱 화면(홈 · 편성 · 캘린더 · 리그 · 운동 찾기 · 결과)에 들이지 않는다.
 * 가족을 아직 못 받았으면(`profiles` 없음) 보내지 않는다 — 받는 동안 튕기지 않게.
 * 아이 화면(아이 모드 · 제 폰 쓰는 아이)은 그 아이가 곧 가족의 아이라 보내지 않는다.
 */
export function mustAddChild({
  kidView,
  me,
  profiles,
}: {
  kidView: boolean;
  me: Pick<ProfileWithSex, "role"> | undefined;
  profiles: readonly Pick<ProfileWithSex, "role">[] | undefined;
}): boolean {
  if (kidView || me?.role !== "PARENT" || !profiles) return false;
  return !profiles.some((p) => p.role === "CHILD");
}

/** 아이 없이도 열어 두는 화면 — 설정(로그아웃 포함) · 알림 · 가족 관리 */
const OPEN_WITHOUT_CHILD = ["/settings", "/notifications", "/parent/family"];

export function openWithoutChild(pathname: string): boolean {
  return OPEN_WITHOUT_CHILD.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
