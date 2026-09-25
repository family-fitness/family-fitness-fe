"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 지금 이 기기를 누가 쓰고 있는가. */
type Mode = "parent" | "kid";

interface RoleState {
  mode: Mode | null;
  /** 아이 모드에서 보고 있는 아이. 부모 모드에서는 "지금 보고 있는 아이" */
  childProfileId: string | null;
  setMode: (mode: Mode) => void;
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
