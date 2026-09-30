"use client";

import { useEffect, type ReactNode } from "react";

import { useRoleStore } from "@/stores/role-store";

/**
 * 아이 구역. 들어오면 이 기기는 아이가 쓰는 중이다 — 홈 화면 바로가기 「오늘 할 운동」 으로 곧장 와도.
 * 모드가 부모로 남으면 아이 홈의 종이 부모 알림을, 설정이 부모 화면과 로그아웃을 연다.
 * 부모로 돌아가는 길은 설정의 「누가 쓰는지 바꾸기」 다.
 */
export default function KidAreaLayout({ children }: { children: ReactNode }) {
  const mode = useRoleStore((s) => s.mode);
  const setMode = useRoleStore((s) => s.setMode);

  useEffect(() => {
    if (mode !== "kid") setMode("kid");
  }, [mode, setMode]);

  return children;
}
