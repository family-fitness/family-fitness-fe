import type { FitnessFactor, FitnessItem } from "./api/types";

/** 측정 항목에 관한 화면 쪽 정보. */

/** 항목 코드 → 그림. 없는 항목은 요인 그림으로 대체한다 */
const POSE_BY_CODE: Record<string, string> = {
  "009": "item/part-core", // 윗몸말아올리기
  "010": "item/item-shoes", // 반복점프
  "012": "item/part-leg", // 앉아윗몸앞으로굽히기
  "013": "item/item-cone", // 일리노이
  "014": "item/item-stopwatch", // 체공시간
  "017": "item/item-stopwatch", // 눈-손협응력
  "019": "item/part-core", // 교차윗몸일으키기
  "020": "item/part-heart", // 왕복오래달리기
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

  자세 그림(`move/*`)을 쓰다가 **몸 부위 그림**으로 바꿨다. 1차로 받은 자세 그림은
  머리카락이 없어서 화면에서 민머리 인형처럼 보인다(다시 뽑기로 했다 —
  ASSET_PROMPTS.md 맨 앞). 부위 그림은 사람을 그리지 않아 그 문제가 없고,
  "어디를 쓰는 운동인가" 를 더 곧장 말해 준다.
*/
const POSE_BY_FACTOR: Record<string, string> = {
  심폐지구력: "item/part-heart",
  근력: "item/part-arm",
  근지구력: "item/part-core",
  유연성: "item/part-leg",
  민첩성: "item/item-cone",
  순발력: "item/item-target",
  협응력: "item/item-stopwatch",
  평형성: "item/part-leg",
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
