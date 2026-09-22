import type { FitnessFactor, FitnessItem } from "./api/types";

/** 측정 항목에 관한 화면 쪽 정보. */

/** 항목 코드 → 그림. 없는 항목은 요인 그림으로 대체한다 */
const POSE_BY_CODE: Record<string, string> = {
  "009": "item/item-mat", // 윗몸말아올리기
  "010": "item/item-shoes", // 반복점프
  "012": "item/item-tape", // 앉아윗몸앞으로굽히기 — 자로 잰다
  "013": "item/item-cone", // 일리노이
  "014": "item/item-stopwatch", // 체공시간
  "017": "item/item-stopwatch", // 눈-손협응력
  "019": "item/item-mat", // 교차윗몸일으키기
  "020": "item/item-shoes", // 왕복오래달리기
  "021": "item/item-cone", // 10m4회왕복달리기
  "022": "item/item-tape", // 제자리멀리뛰기
  "028": "item/item-grip", // 상대악력
  "035": "item/item-shoes",
  "037": "item/item-shoes",
  "040": "item/item-stopwatch", // 반응시간
  "041": "item/item-stopwatch", // 성인체공시간
  "043": "item/item-shoes", // 반복옆뛰기
  "050": "item/item-cone", // 5m4회왕복달리기
  "051": "item/item-stopwatch", // 3x3버튼누르기
};

/*
  요인 그림.

  **운동 도구만 쓴다.** 여기까지 두 번 갈아탔다.

  1. 자세 그림(`move/*`) — 1차로 받은 것이 머리카락이 없어 민머리 인형처럼
     보였다. 다시 뽑기로 했다(ASSET_PROMPTS.md 맨 앞).
  2. 몸 부위 그림(`item/part-*`) — 사람을 안 그려서 괜찮을 줄 알았는데,
     팔과 다리는 잘린 것처럼 보이고 `part-core` 는 **맨 배**다. 아이 건강
     서비스에서 40px 넘게 키워 놓으면 보기 불편하다.

  도구는 그 둘 다 아니면서 "무엇을 하는 운동인가" 를 곧장 말한다.
  `item/part-*` 파일은 지우지 않았다 — 나중에 몸 그림이 필요한 자리가 생기면
  쓸 수 있고, 지금은 부르는 곳이 없다.
*/
const POSE_BY_FACTOR: Record<string, string> = {
  심폐지구력: "item/item-shoes",
  근력: "item/item-grip",
  근지구력: "item/item-mat",
  유연성: "item/item-tape",
  민첩성: "item/item-cone",
  순발력: "item/item-target",
  협응력: "item/item-stopwatch",
  평형성: "item/item-cone",
};

export function itemPose(item: Pick<FitnessItem, "itemCode" | "factor">): string {
  return POSE_BY_CODE[item.itemCode ?? ""] ?? factorPose(item.factor ?? undefined);
}

/** 장비가 필요한 항목에만 그 장비 그림을 붙인다. 악력계가 뭔지 모르는 사람이 많다 */
const EQUIPMENT_ART: Record<string, string> = {
  "028": "item/item-grip",
  "022": "item/item-tape",
  "020": "item/item-cone",
  "050": "item/item-cone",
  "021": "item/item-cone",
  "013": "item/item-cone",
  "040": "item/item-stopwatch",
  "017": "item/item-stopwatch",
  "051": "item/item-stopwatch",
  "035": "item/item-shoes",
  "037": "item/item-shoes",
};

export function equipmentArt(itemCode: string | undefined): string | undefined {
  return itemCode ? EQUIPMENT_ART[itemCode] : undefined;
}

/** 요인 → 그림. 레이더 · 결과 화면에서 쓴다 */
export function factorPose(factor: FitnessFactor | string | undefined): string {
  return POSE_BY_FACTOR[factor ?? ""] ?? "item/item-target";
}
