import type { AvatarParts } from "@/components/ui/illustration";
import type { ProfileSummary } from "./api/types";

/**
 * 프로필로 아바타 부품을 고른다.
 *
 * 나이대마다 고르는 통이 다르다. 어른에게 양갈래 머리를 씌우면 가족 화면이
 * 아이들만 모인 것처럼 보이고, 아이에게 앞치마를 입히면 반대가 된다.
 *
 * 같은 프로필은 언제 봐도 같은 모습이어야 한다. profileId 를 씨앗으로 쓴다.
 */
const KID_HAIR = ["hair-bob", "hair-ponytail", "hair-short-m", "hair-crop", "hair-twintail"];
const ADULT_HAIR = ["hair-mom-long", "hair-dad-short", "hair-bun", "hair-curly", "hair-cap"];

const KID_TOPS = ["top-jersey-blue", "top-jersey-white", "top-hoodie", "top-tshirt-yellow"];
const ADULT_TOPS = ["top-tracksuit", "top-apron", "top-hoodie", "top-jersey-white"];

/** 평상시 얼굴. 다 웃고 있으면 누가 누군지 구분되지 않는다 */
const KID_FACES = ["face-calm", "face-happy", "face-cheer", "face-proud"];
const ADULT_FACES = ["face-parent-1", "face-parent-2", "face-parent-3", "face-calm"];

function hash(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 씨앗을 조금 비틀어 부품마다 다른 수를 뽑는다 */
function pick(list: string[], seed: string, salt: string): string {
  return list[hash(seed + salt) % list.length];
}

export function avatarFor(profile: {
  profileId?: string;
  ageGroup?: ProfileSummary["ageGroup"];
}): AvatarParts {
  const seed = profile.profileId ?? "";
  const h = hash(seed);
  const grown = profile.ageGroup === "성인" || profile.ageGroup === "어르신";

  const body =
    profile.ageGroup === "유아기"
      ? h % 2 === 0
        ? "body-toddler"
        : "body-child-f"
      : grown
        ? h % 2 === 0
          ? "body-adult-m"
          : "body-adult-f"
        : h % 2 === 0
          ? "body-child-m"
          : "body-child-f";

  return {
    body,
    hair: pick(grown ? ADULT_HAIR : KID_HAIR, seed, "hair"),
    face: pick(grown ? ADULT_FACES : KID_FACES, seed, "face"),
    top: pick(grown ? ADULT_TOPS : KID_TOPS, seed, "top"),
  };
}
