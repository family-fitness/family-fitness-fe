import { Onboarding } from "@/components/domain/onboarding";

/**
 * 첫 시작 — 새 계정. 키움이 인사부터 가족 · 보호자 · 아이 · 동의 · 참여 방식 · 운동 시간 · 첫 측정까지
 * 한 화면에 질문 하나씩(9/25). 흐름은 `Onboarding` 에.
 */
export default function CreateFamilyPage() {
  return <Onboarding mode="family" />;
}
