import { ASSETS } from "@/lib/asset-list";
import type { Stage } from "@/lib/levels";

/**
 * 키움이 그림 한 장 안의 몸 비율 — 입체 장면에 종이 인형으로 세울 때 쓴다.
 *
 *   feet — 그림 아래 끝에서 발끝까지(그림 높이에 대한 비율). 스프라이트를 여기서 세운다
 *   body — 발끝에서 모자 꼭대기까지(새싹은 뺀다). 「키움이 키 = 몇」 을 맞출 때 쓴다
 *
 * 주문한 그림(PNG)과 그림이 오기 전의 코드 그림(SVG)은 비율이 다르다 — PNG 는 캔버스를 더 채운다.
 * 둘 중 지금 서는 쪽의 값을 준다. 재 본 값(1024 캔버스 다섯 단계): 발끝 0.94~0.97, 모자 0.23~0.29.
 */
export interface BuddyFrame {
  feet: number;
  body: number;
}

const DRAWN: BuddyFrame = { feet: 9 / 160, body: (151 - 54) / 160 };
const ART: BuddyFrame = { feet: 0.05, body: 0.69 };

export function buddyFrame(stage: Stage, cheer = false): BuddyFrame {
  return ASSETS.has(`level/level-${stage}${cheer ? "-cheer" : ""}`) ? ART : DRAWN;
}
