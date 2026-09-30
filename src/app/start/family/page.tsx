import { Suspense } from "react";

import { WizardSkeleton } from "@/components/app-shell/wizard";
import { Onboarding } from "@/components/domain/onboarding";

/**
 * 첫 시작, 새 계정. 키움이 인사와 가족, 보호자부터 아이, 동의, 운동 시간, 참여 방식, 첫 측정까지 다섯 화면.
 * 가족 화면이 먼저고 아이는 그 뒤다. 차례는 `lib/onboarding`, 흐름은 `Onboarding` 에.
 */
export default function CreateFamilyPage() {
  return (
    <Suspense fallback={<WizardSkeleton />}>
      <Onboarding mode="family" />
    </Suspense>
  );
}
