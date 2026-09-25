import type { ReactNode } from "react";

import { ParentOnly } from "@/components/app-shell/parent-only";

/**
 * 측정 · 측정 결과 · 10년 위 연령대 — 부모 화면이다. 아이는 백분위 표와 등급, 약한 요인을 보지 않는다(규칙 10).
 * 역할을 바꾼 뒤 뒤로 가기로 들어와도 아이 홈으로 돌려보낸다.
 */
export default function ProfilePagesLayout({ children }: { children: ReactNode }) {
  return <ParentOnly>{children}</ParentOnly>;
}
