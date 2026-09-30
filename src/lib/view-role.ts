"use client";

import { useSyncExternalStore } from "react";

import { useSession } from "./session";
import { useRoleStore } from "@/stores/role-store";

const noop = () => () => {};

/**
 * 브라우저에서 그리기 시작했나. 역할(이 기기에 둔 값)은 서버가 모른다 — 서버가 그린 첫 화면과 브라우저의 첫 화면이
 * 다르면 React 가 어긋남 오류를 낸다. 역할로 가르는 문지기는 이게 true 가 된 뒤에 가른다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

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
