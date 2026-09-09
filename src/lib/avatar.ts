import type { Profile } from "./api/types";
import type { AvatarParts } from "@/components/ui/illustration";

/**
 * 프로필로 아바타 부품을 고른다.
 *
 * 사진을 받지 않는 서비스라 얼굴이 없다. 그렇다고 이니셜 동그라미만 두면
 * 가족 다섯이 전부 같은 회색 원으로 보인다. 나이 · 성별 · 역할로 부품을 갈라
 * 각자 다르게 보이게 한다.
 *
 * 같은 사람은 항상 같은 모습이어야 하므로 id 로 고정한다.
 */
const HAIR_F = ["hair-bob", "hair-ponytail", "hair-bun", "hair-twintail"];
const HAIR_M = ["hair-short-m", "hair-crop", "hair-curly", "hair-cap"];
const TOPS = ["top-jersey-blue", "top-jersey-white", "top-hoodie", "top-tshirt-yellow"];

function pick<T>(list: T[], seed: string): T {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return list[hash % list.length];
}

export function avatarFor(profile: Profile): AvatarParts {
  const body =
    profile.age < 4
      ? "body-toddler"
      : profile.age < 13
        ? profile.sex === "FEMALE"
          ? "body-child-f"
          : "body-child-m"
        : profile.sex === "FEMALE"
          ? "body-adult-f"
          : "body-adult-m";

  return {
    body,
    hair: pick(profile.sex === "FEMALE" ? HAIR_F : HAIR_M, profile.id),
    face: "face-calm",
    top: pick(TOPS, profile.id + profile.displayName),
  };
}
