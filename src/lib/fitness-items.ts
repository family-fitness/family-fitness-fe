import type { FitnessItemCode, FitnessItemMeta, FitnessDomain, FitnessGrade } from "./api/types";

/**
 * 측정 항목 메타데이터.
 *
 * 원본은 백엔드의 Kotlin enum FitnessItem 이고, 정식으로는
 * GET /api/v1/fitness/items 로 받아온다. 이건 백엔드가 없을 때 쓰는 사본이자
 * 라벨·단위처럼 화면에서만 필요한 정보의 출처다.
 */
export const FITNESS_ITEMS: Record<FitnessItemCode, FitnessItemMeta> = {
  SIT_UP: {
    code: "SIT_UP",
    label: "윗몸말아올리기",
    unit: "회",
    domain: "MUSCLE_ENDURANCE",
    optionalInput: false,
    ageGroups: ["YOUTH", "ADULT"],
    higherIsBetter: true,
    hint: "1분 동안 몇 번 했는지 세어 주세요",
  },
  SIT_AND_REACH: {
    code: "SIT_AND_REACH",
    label: "앉아윗몸앞으로굽히기",
    unit: "cm",
    domain: "FLEXIBILITY",
    optionalInput: false,
    ageGroups: ["TODDLER", "YOUTH", "ADULT"],
    higherIsBetter: true,
    hint: "발끝을 0으로 두고 손끝이 닿은 위치까지",
  },
  SINGLE_LEG_STAND: {
    code: "SINGLE_LEG_STAND",
    label: "외발서기",
    unit: "초",
    domain: "BALANCE",
    optionalInput: false,
    ageGroups: ["TODDLER"],
    higherIsBetter: true,
    hint: "눈을 뜨고 한 발로 버틴 시간",
  },
  GRIP_STRENGTH: {
    code: "GRIP_STRENGTH",
    label: "악력",
    unit: "kg",
    domain: "MUSCLE_STRENGTH",
    // 악력계가 있는 집이 거의 없다. 첫 화면에서 장비를 요구하면 거기서 이탈한다
    optionalInput: true,
    ageGroups: ["TODDLER", "YOUTH", "ADULT"],
    higherIsBetter: true,
    hint: "악력계가 필요해요",
  },
  STANDING_LONG_JUMP: {
    code: "STANDING_LONG_JUMP",
    label: "제자리멀리뛰기",
    unit: "cm",
    domain: "POWER",
    optionalInput: true,
    ageGroups: ["YOUTH", "ADULT"],
    higherIsBetter: true,
    hint: "2m 이상 뛸 공간이 필요해요",
  },
  SHUTTLE_RUN: {
    code: "SHUTTLE_RUN",
    label: "왕복오래달리기",
    unit: "회",
    domain: "CARDIO",
    optionalInput: true,
    ageGroups: ["YOUTH", "ADULT"],
    higherIsBetter: true,
    hint: "20m 왕복 코스가 필요해요",
  },
};

export const FITNESS_ITEM_LIST = Object.values(FITNESS_ITEMS);

export const DOMAIN_LABEL: Record<FitnessDomain, string> = {
  MUSCLE_ENDURANCE: "근지구력",
  FLEXIBILITY: "유연성",
  BALANCE: "평형성",
  MUSCLE_STRENGTH: "근력",
  POWER: "순발력",
  CARDIO: "심폐지구력",
};

/** 국민체력100 등급 표기. 1등급이 가장 높다 */
export const GRADE_LABEL: Record<FitnessGrade, string> = {
  1: "1등급",
  2: "2등급",
  3: "3등급",
  4: "4등급",
  5: "5등급",
};

export function itemLabel(code: FitnessItemCode): string {
  return FITNESS_ITEMS[code]?.label ?? code;
}

/** 백분위를 "상위 30%" 같은 사람 말로 바꾼다 */
export function percentileText(percentile: number): string {
  return `상위 ${Math.max(1, Math.round(100 - percentile))}%`;
}
