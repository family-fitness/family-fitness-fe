/**
 * 칭찬 스티커 열두 장.
 *
 * 부모는 **고르기만 해도 보낸다**(규칙 12). 글은 덧붙이고 싶을 때만.
 * 이름이 곧 한마디다 — 「최고야」 스티커를 받으면 「최고야」 라는 말을 받은 것이다.
 *
 * 개수를 목표로 두지 않는다. 「10장 모으면」 을 붙이면 못 채운 날이 실패가 된다.
 *
 * ▲ 요청: `CheerRequest.stickerId`. 지금은 계약의 `emoji` 칸에 이 `id` 를 싣는다.
 */
export interface Sticker {
  id: string;
  /** 붙일 때 같이 가는 한마디 */
  label: string;
  /** 그림 이름. `sticker/*` 가 오기 전까지는 옛 도장이 대신 선다(`interim-art.ts`) */
  art: string;
}

export const STICKERS: readonly Sticker[] = [
  { id: "star", label: "최고야", art: "sticker/sticker-star" },
  { id: "thumb", label: "엄지척", art: "sticker/sticker-thumb" },
  { id: "medal", label: "멋져", art: "sticker/sticker-medal" },
  { id: "heart", label: "사랑해", art: "sticker/sticker-heart" },
  { id: "crown", label: "대단해", art: "sticker/sticker-crown" },
  { id: "flag", label: "끝까지 했네", art: "sticker/sticker-flag" },
  { id: "sprout", label: "쑥쑥 자라라", art: "sticker/sticker-sprout" },
  { id: "sparkle", label: "반짝반짝", art: "sticker/sticker-sparkle" },
  { id: "clap", label: "짝짝짝", art: "sticker/sticker-clap" },
  { id: "rocket", label: "슝 빨라졌어", art: "sticker/sticker-rocket" },
  { id: "sun", label: "오늘도 맑음", art: "sticker/sticker-sun" },
  { id: "kiumi", label: "꼭 안아 줄게", art: "sticker/sticker-kiumi" },
];

/** 코드로 스티커를 찾는다. 모르는 코드면 undefined — 지어내지 않는다 */
export function stickerOf(id: string | null | undefined): Sticker | undefined {
  return STICKERS.find((s) => s.id === id);
}

/** 메모 길이. 한 줄로 읽히게 */
export const MEMO_MAX = 60;
