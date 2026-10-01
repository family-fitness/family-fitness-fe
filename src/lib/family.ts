import type { NextStep, ProfileWithSex } from "./api/types";
import { withJosa } from "./utils";

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

/**
 * 가족이 아직 없으면 먼저 가야 할 곳. 가족이 없으면 가족 만들기, 초대코드로 합류하기 전이면 합류 화면.
 * 스플래시와 앱 화면 가드가 같이 쓴다. 가족이 있거나 `/me` 를 아직 못 받았으면 null.
 */
export function familySetupPath(nextStep: NextStep | undefined): "/start/family" | "/claim" | null {
  if (nextStep === "CREATE_FAMILY") return "/start/family";
  if (nextStep === "CLAIM") return "/claim";
  return null;
}

/**
 * 앱 화면 가드가 가족 없는 계정을 보낼 곳.
 *
 * 스플래시만 `nextStep` 을 보면, 초대 합류가 실패한 뒤 뒤로 가거나 주소를 쳐서 들어온 계정이
 * 가족 없이 부모 홈과 대시보드를 그대로 봤다(「우리집」, 「구성원 0명」).
 * 설정(로그아웃과 참여 방식 고르기)은 열어 둔다.
 */
export function mustSetUpFamily({
  nextStep,
  pathname,
}: {
  nextStep: NextStep | undefined;
  pathname: string;
}): "/start/family" | "/claim" | null {
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return null;
  return familySetupPath(nextStep);
}

/**
 * 이 줄의 구성원을 내보낼 수 있나. 가족을 만든 사람(오너)만, 자기 자신이 아닌 구성원을 내보낸다.
 * 서버도 오너가 아니면 403, 자기 자신이면 409 CANNOT_REMOVE_SELF 로 거절한다
 */
export function canRemoveMember(
  me: Pick<ProfileWithSex, "profileId" | "isOwner"> | undefined,
  member: Pick<ProfileWithSex, "profileId">,
): boolean {
  if (!me?.isOwner || !me.profileId || !member.profileId) return false;
  return member.profileId !== me.profileId;
}

/**
 * 구성원 내보내기 확인 시트의 제목과 글. 내보내면 그 사람의 프로필과 기록이 지워진다.
 * 계정이 있는 사람이면 계정은 남고 우리 가족에서만 빠진다
 */
export function removeMemberCopy(member: Pick<ProfileWithSex, "name" | "hasAccount">): {
  title: string;
  lines: string[];
} {
  const name = member.name?.trim() || "이 구성원";
  return {
    title: `${withJosa(name, "을를")} 내보낼까요`,
    lines: [
      `가족에서 내보내면 ${name}의 기록이 모두 지워져요`,
      "지운 기록은 되돌릴 수 없어요",
      ...(member.hasAccount ? [`${name}의 계정은 지워지지 않고 우리 가족에서만 빠져요`] : []),
    ],
  };
}
