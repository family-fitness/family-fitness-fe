import type { AvatarParts } from "@/components/ui/illustration";
import type { AvatarChoice } from "@/stores/avatar-store";
import type { ProfileSummary } from "./api/types";

/**
 * 프로필로 아바타 부품을 고른다.
 *
 * 나이대마다 고르는 통이 다르다. 어른에게 양갈래 머리를 씌우면 가족 화면이
 * 아이들만 모인 것처럼 보이고, 아이에게 앞치마를 입히면 반대가 된다.
 *
 * 같은 프로필은 언제 봐도 같은 모습이어야 한다. profileId 를 씨앗으로 쓴다.
 */
/** 아이가 꾸미기에서 고를 수 있는 전부. 고르는 자리에서는 성별로 나누지 않는다 */
const KID_HAIR = [
  "hair-bob",
  "hair-ponytail",
  "hair-short-m",
  "hair-crop",
  "hair-twintail",
  "hair-cap-blue",
];
/* 자동으로 고를 때만 성별을 따른다 */
const KID_HAIR_M = ["hair-short-m", "hair-crop", "hair-cap-blue"];
const KID_HAIR_F = ["hair-bob", "hair-ponytail", "hair-twintail"];
const ADULT_HAIR_M = ["hair-dad-short", "hair-cap"];
const ADULT_HAIR_F = ["hair-mom-long", "hair-bun", "hair-curly"];

/** 평상시 얼굴. 다 웃고 있으면 누가 누군지 구분되지 않는다 */
const KID_FACES = ["face-calm", "face-happy", "face-cheer", "face-proud", "face-focused"];
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

/** 아이가 꾸미기 화면에서 고를 수 있는 것들. 여기 없는 부품은 화면에 안 나온다 */
export const PICKABLE = {
  hair: KID_HAIR,
  face: KID_FACES,
  body: ["body-child-m", "body-child-f"],
} as const;

/** 고르는 칸을 소리로 읽을 때 쓰는 이름. "hair-bob" 은 사람 말이 아니다 */
export const PART_LABEL: Record<string, string> = {
  "hair-bob": "단발",
  "hair-ponytail": "묶은 머리",
  "hair-short-m": "짧은 머리",
  "hair-crop": "아주 짧은 머리",
  "hair-twintail": "양갈래",
  "hair-cap-blue": "모자",
  "face-calm": "평소 얼굴",
  "face-happy": "웃는 얼굴",
  "face-cheer": "신난 얼굴",
  "face-proud": "뿌듯한 얼굴",
  "face-focused": "집중한 얼굴",
  "body-child-m": "반팔에 반바지",
  "body-child-f": "티셔츠에 치마바지",
};

export function avatarFor(
  profile: {
    profileId?: string;
    ageGroup?: ProfileSummary["ageGroup"];
    /**
     * 있으면 이걸로 몸을 고른다.
     * ▲ 서버가 아직 조회 응답에 안 준다 — 없으면 프로필 번호로 갈음한다.
     * 해시로 고르면 아빠가 절반의 확률로 엄마 모습이 된다.
     */
    sex?: "M" | "F" | null;
  },
  /** 아이가 직접 고른 것이 있으면 그게 먼저다 */
  chosen?: AvatarChoice,
): AvatarParts {
  const seed = profile.profileId ?? "";
  const h = hash(seed);
  const grown = profile.ageGroup === "성인" || profile.ageGroup === "어르신";
  /*
    생성된 `ProfileSummary` 에 아직 `sex` 가 없다. 화면들은 서버가 준 객체를
    그대로 넘기므로 값이 오기 시작하면 타입을 다시 만들지 않아도 바로 쓰인다.
    없으면 지금처럼 프로필 번호로 갈음한다.
  */
  const given = profile.sex ?? (profile as { sex?: "M" | "F" | null }).sex;
  const male = given ? given === "M" : h % 2 === 0;

  const body =
    profile.ageGroup === "유아기"
      ? male
        ? "body-toddler"
        : "body-child-f"
      : grown
        ? male
          ? "body-adult-m"
          : "body-adult-f"
        : male
          ? "body-child-m"
          : "body-child-f";

  /* 머리도 성별을 따른다. 아빠에게 양갈래를 씌우면 가족 화면이 어긋난다 */
  const hairs = grown ? (male ? ADULT_HAIR_M : ADULT_HAIR_F) : male ? KID_HAIR_M : KID_HAIR_F;

  return {
    body: chosen?.body ?? body,
    hair: chosen?.hair ?? pick(hairs, seed, "hair"),
    face: chosen?.face ?? pick(grown ? ADULT_FACES : KID_FACES, seed, "face"),
  };
}
