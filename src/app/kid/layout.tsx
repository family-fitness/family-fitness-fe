"use client";

import { useEffect, type ReactNode } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useRoleStore } from "@/stores/role-store";

/**
 * 아이 구역. 들어오면 이 기기는 아이가 쓰는 중이다 — 홈 화면 바로가기 「오늘 할 운동」 으로 곧장 와도.
 * 모드가 부모로 남으면 아이 홈의 종이 부모 알림을, 설정이 부모 화면과 로그아웃을 연다.
 * 부모로 돌아가는 길은 아이 홈 머리의 「어른 화면」 이다(보호자 계정일 때만).
 */
export default function KidAreaLayout({ children }: { children: ReactNode }) {
  const setMode = useRoleStore((s) => s.setMode);
  const signedIn = useAuthStore((s) => Boolean(s.accessToken));

  // 들어와 있을 때만 — 나간 기기에서 바로가기로 들어오면 아이 모드가 되어, 다음에 들어온 부모가 아이 홈에 갇혔다.
  // 들어올 때(그리고 로그인했을 때) 한 번만 정한다. 모드가 바뀔 때마다 다시 정하면 「어른 화면」 을 눌러
  // 부모로 바꾼 것을 부모 홈으로 넘어가기 전에 도로 아이로 되돌렸다
  useEffect(() => {
    if (signedIn && useRoleStore.getState().mode !== "kid") setMode("kid");
  }, [signedIn, setMode]);

  return children;
}
