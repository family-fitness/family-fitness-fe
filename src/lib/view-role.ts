"use client";

import { useSession } from "./session";
import { useRoleStore } from "@/stores/role-store";

/**
 * 지금 화면을 아이가 보고 있는가.
 *
 * 계정 역할만 보면 안 된다. 부모 계정으로 로그인한 폰을 아이가 아이 모드로
 * 쓰는 일이 실제로 있고, 그때도 아이에게 보여주지 않기로 한 것은 가려야 한다.
 */
export function useIsKidView(): boolean {
  const { profile } = useSession();
  const mode = useRoleStore((s) => s.mode);
  return profile?.role === "CHILD" || mode === "kid";
}
