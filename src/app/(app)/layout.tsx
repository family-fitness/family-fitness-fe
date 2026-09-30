import type { ReactNode } from "react";

import { ChildRequired } from "@/components/app-shell/child-required";

/** 캘린더 · 운동 찾기 · 결과 — 아이 없는 가족은 아이 등록부터. 설정 · 알림은 열어 둔다 */
export default function AppAreaLayout({ children }: { children: ReactNode }) {
  return <ChildRequired>{children}</ChildRequired>;
}
