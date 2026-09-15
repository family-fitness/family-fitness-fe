import type { AvatarParts } from "@/components/ui/illustration";
import type { ProfileSummary } from "./api/types";

/**
 * 프로필로 아바타 부품을 고른다.
 *
 * 사진을 받지 않는 서비스라 얼굴이 없다. 이니셜 동그라미만 두면 가족 전원이
 * 같은 회색 원으로 보인다. 연령대 · 역할로 부품을 갈라 각자 다르게 보이게 한다.
 *
 * 같은 사람은 항상 같은 모습이어야 하므로 profileId 로 고정한다.
 * 성별은 ProfileSummary 에 없다(identity 가 공개하지 않는다) — 이름으로 정하지 않고
 * id 해시로 고른다.
 */
const HAIR = [
  "hair-bob",
  "hair-ponytail",
  "hair-short-m",
  "hair-crop",
  "hair-twintail",
  "hair-curly",
  "hair-bun",
  "hair-cap",
];
const TOPS = ["top-jersey-blue", "top-jersey-white", "top-hoodie", "top-tshirt-yellow"];

function hash(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function avatarFor(profile: {
  profileId?: string;
  ageGroup?: ProfileSummary["ageGroup"];
}): AvatarParts {
  const seed = profile.profileId ?? "";
  const h = hash(seed);

  const body =
    profile.ageGroup === "유아기"
      ? h % 2 === 0
        ? "body-toddler"
        : "body-child-f"
      : profile.ageGroup === "유소년" || profile.ageGroup === "청소년"
        ? h % 2 === 0
          ? "body-child-m"
          : "body-child-f"
        : h % 2 === 0
          ? "body-adult-m"
          : "body-adult-f";

  return {
    body,
    hair: HAIR[h % HAIR.length],
    face: "face-calm",
    top: TOPS[hash(seed + "top") % TOPS.length],
  };
}
