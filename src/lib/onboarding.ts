import { ageOf, today } from "./today";

/**
 * 첫 시작(가입)과 아이 더하기의 화면 차례.
 *
 * 전에는 한 화면에 하나씩 물어 가입이 열여섯 화면이었다. 사용자가 「단계가 너무 길어」 라고 해서
 * 같은 사람에게 묻는 것은 한 화면에 묶었다.
 *
 *   family    키움이 인사, 가족 이름, 보호자 이름, 성별, 생년월일
 *   kid       아이 이름, 생일, 성별
 *   kid-body  키, 몸무게, 보호자 동의(만 14세 미만일 때만)
 *   together  운동할 수 있는 요일과 시간, 보호자가 얼마나 같이 할지
 *   done      준비됐어요, 지금 체력을 잴지 나중에 할지
 *
 * 가족 화면이 늘 먼저다. 아이 정보는 가족과 보호자를 다 적은 뒤에 묻는다.
 * 사진은 가입 때 묻지 않는다. 설정과 가족 관리에서 올린다.
 */
export type OnboardingStep = "family" | "kid" | "kid-body" | "together" | "done";

/**
 * 가족과 아이를 서버에 만드는 화면. 이 화면을 넘길 때 가족을 만들고 곧바로 아이를 만든다.
 *
 * 가족을 보호자 화면에서 먼저 만들면, 아이를 적기 전에 앱을 닫은 사람은 「아이 없는 가족」 이 된다.
 * 다시 열면 아이 없는 가족을 막는 가드(ChildRequired)가 곧장 아이 등록으로 보내, 시작하자마자
 * 아이 정보부터 묻는 것처럼 보였다. 둘을 함께 만들면 중간에 닫아도 가족 만들기부터 다시 한다.
 */
export const CREATE_AT: OnboardingStep = "kid-body";

export function onboardingSteps(mode: "family" | "child"): OnboardingStep[] {
  return mode === "family"
    ? ["family", "kid", "kid-body", "together", "done"]
    : ["kid", "kid-body", "together", "done"];
}

/** 가족은 만 14세부터 만들 수 있다. 서버도 UNDER_14_NOT_ALLOWED 로 막는다 */
export const GUARDIAN_MIN_AGE = 14;

export function guardianOldEnough(birthDate: string, on?: string): boolean {
  const age = ageOf(birthDate, on);
  return age != null && age >= GUARDIAN_MIN_AGE;
}

/**
 * 가족 화면에서 넘어가지 못하는 까닭(만 14세). 생년월일이 비었거나 오늘 뒤면 나이를 말하지 않는다.
 *
 * 이 글은 생년월일 칸 밑에만 있어 360px 폰에서 「다음」 단추 영역에 가려졌다.
 * 첫 시작 화면은 같은 글을 단추 바로 위 안내 문구 자리에도 띄운다.
 */
export function guardianAgeProblem(birthDate: string, on: string = today()): string | null {
  if (birthDate === "" || birthDate > on) return null;
  return guardianOldEnough(birthDate, on)
    ? null
    : `가족은 만 ${GUARDIAN_MIN_AGE}세부터 만들 수 있어요`;
}
