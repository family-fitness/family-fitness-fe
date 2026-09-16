import type { AvatarParts } from "@/components/ui/illustration";
import type { ProfileSummary } from "./api/types";

/** 프로필로 아바타 부품을 고른다. */
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
