import type { Band, FitnessFactor, FitnessItem } from "./api/types";

/**
 * 측정 항목에 관한 화면 쪽 정보.
 *
 * **항목 목록 자체는 서버가 준다** — 연령대가 폼을 바꾸므로 프론트가 하드코딩하지 않는다
 * (GET /fitness/items?ageGroup=). 여기 있는 건 그림 매핑처럼 화면에만 필요한 것이다.
 *
 * 항목 식별자는 이름이 아니라 3자리 코드다.
 */

/** 항목 코드 → 자세 그림. 없는 항목은 요인 그림으로 대체한다 */
const POSE_BY_CODE: Record<string, string> = {
  "009": "move/move-situp", // 윗몸말아올리기
  "010": "move/move-jump-rope", // 반복점프
  "012": "move/move-sit-and-reach", // 앉아윗몸앞으로굽히기
  "013": "move/move-shuttle-run", // 일리노이
  "014": "move/move-long-jump", // 체공시간
  "017": "move/move-plank", // 눈-손협응력
  "019": "move/move-situp", // 교차윗몸일으키기
  "020": "move/move-shuttle-run", // 왕복오래달리기
  "021": "move/move-shuttle-run", // 10m4회왕복달리기
  "022": "move/move-long-jump", // 제자리멀리뛰기
  "028": "move/move-grip", // 상대악력
  "035": "move/move-walk",
  "037": "move/move-walk",
  "040": "move/move-squat", // 반응시간
  "041": "move/move-long-jump", // 성인체공시간
  "043": "move/move-jump-rope", // 반복옆뛰기
  "050": "move/move-shuttle-run", // 5m4회왕복달리기
  "051": "move/move-plank", // 3x3버튼누르기
};

const POSE_BY_FACTOR: Record<string, string> = {
  심폐지구력: "move/move-shuttle-run",
  근력: "move/move-grip",
  근지구력: "move/move-situp",
  유연성: "move/move-stretch-leg",
  민첩성: "move/move-jump-rope",
  순발력: "move/move-long-jump",
  협응력: "move/move-plank",
  평형성: "move/move-single-leg",
};

export function itemPose(item: Pick<FitnessItem, "itemCode" | "factor">): string {
  return (
    POSE_BY_CODE[item.itemCode ?? ""] ?? POSE_BY_FACTOR[item.factor ?? ""] ?? "move/move-situp"
  );
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
  return POSE_BY_FACTOR[factor ?? ""] ?? "move/move-situp";
}

/**
 * band 를 도장 그림으로.
 * 등급 도장 5장을 3단계에 나눠 쓴다. 색으로 좋고 나쁨을 가르지 않는다.
 */
export function bandSeal(band: Band | null | undefined): string {
  if (band === "strength") return "item/grade-1";
  if (band === "steady") return "item/grade-3";
  return "item/grade-5";
}

/** 등급 문자열("1등급"·"참가")을 도장으로 */
export function gradeSeal(grade: string | null | undefined): string {
  const n = grade?.match(/^(\d)등급$/)?.[1];
  return n ? `item/grade-${n}` : "item/grade-4";
}
