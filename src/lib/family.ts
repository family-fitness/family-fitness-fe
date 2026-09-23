import type { ProfileWithSex } from "./api/types";

/**
 * 아이 화면에서 가족을 부르는 말.
 *
 * 아이는 부모를 이름으로 부르지 않는다 — 「은영이 스티커를 붙여 줬어요」 가 아니라
 * 「엄마가 스티커를 붙여 줬어요」. 성별을 모르면 이름으로 둔다(지어내지 않는다).
 * 부모 화면에서는 늘 이름이다.
 */
export function callName(
  person: Pick<ProfileWithSex, "name" | "role" | "sex"> | undefined,
  fallback: string,
  forKid: boolean,
): string {
  if (!person) return fallback;
  if (forKid && person.role === "PARENT") {
    if (person.sex === "F") return "엄마";
    if (person.sex === "M") return "아빠";
  }
  return person.name ?? fallback;
}
