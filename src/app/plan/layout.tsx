import type { ReactNode } from "react";

import { ChildRequired } from "@/components/app-shell/child-required";

/** 운동 짜기 — 아이 없는 가족은 아이 등록부터 */
export default function PlanAreaLayout({ children }: { children: ReactNode }) {
  return <ChildRequired>{children}</ChildRequired>;
}
