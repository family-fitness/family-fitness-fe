"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ViewMode } from "@/lib/role-mode";

/**
 * 지금 이 기기를 누가 쓰고 있는가.
 *
 * 비어 있으면 스플래시가 계정의 역할로 채운다(`modeFor`). 보호자가 보호자 홈의 「아이 화면」 으로
 * 폰을 아이에게 빌려줄 때(그리고 아이 홈의 「어른 화면」 으로 돌려받을 때)만 손으로 바꾼다.
 */
interface RoleState {
  mode: ViewMode | null;
  /** 아이 모드에서 보고 있는 아이. 부모 모드에서는 "지금 보고 있는 아이" */
  childProfileId: string | null;
  setMode: (mode: ViewMode) => void;
  setChild: (profileId: string | null) => void;
  reset: () => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      mode: null,
      childProfileId: null,
      setMode: (mode) => set({ mode }),
      setChild: (childProfileId) => set({ childProfileId }),
      reset: () => set({ mode: null, childProfileId: null }),
    }),
    { name: "ff-role" },
  ),
);
