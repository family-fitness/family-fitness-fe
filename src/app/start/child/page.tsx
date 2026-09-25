import { Suspense } from "react";

import { WizardSkeleton } from "@/components/app-shell/wizard";
import { Onboarding } from "@/components/domain/onboarding";

/**
 * 아이 더하기 — 아이 이름부터 동의 · 운동 시간 · 첫 측정까지. 첫 시작과 같은 틀 · 같은 질문이다.
 * 부모 홈의 이름 알약 · 캘린더의 빈 자리 · 누가 쓰는지(아이가 없을 때)에서 들어온다.
 */
export default function AddChildPage() {
  return (
    <Suspense fallback={<WizardSkeleton />}>
      <Onboarding mode="child" />
    </Suspense>
  );
}
