/**
 * 키움이 그림 한 장 안의 몸 비율 — 입체 장면에 종이 인형으로 세울 때 쓴다.
 *
 *   feet — 그림 아래 끝에서 발끝까지(그림 높이에 대한 비율). 스프라이트를 여기서 세운다
 *   body — 발끝에서 모자 꼭대기까지(새싹은 뺀다). 「키움이 키 = 몇」 을 맞출 때 쓴다
 *
 * 재 본 값(1024 캔버스 다섯 단계): 발끝 0.94~0.97, 모자 0.23~0.29.
 */
export const BUDDY_FRAME = { feet: 0.05, body: 0.69 } as const;

/**
 * 서 있는 캐릭터를 그림 한 장으로 — 섬 · 키 자 · 징검다리 위에 세울 종이 인형이다.
 * 먼저 서 있는 2D 캐릭터(`LevelBuddy`)의 그림을 그대로 쓴다. 그림이 없으면 null — 캐릭터 없이 선다.
 *
 * 섬 파일(island · decorations)과 떨어뜨려 둔다. 키 자 · 징검다리가 이것 하나 때문에 섬 코드를 같이 받았다.
 */
export async function mascotImage(stand: HTMLElement): Promise<HTMLImageElement | null> {
  const img = stand.querySelector("img");
  if (!img) return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = img.src;
  });
}
