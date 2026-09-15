"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 지금 이 기기를 누가 쓰고 있는가.
 *
 * **계정은 하나인데 쓰는 사람이 둘이다.** 부모 폰에서 아이가 잠깐 운동할 수도 있고,
 * 아이 폰에 부모가 도장을 찍어 줄 수도 있다. 그래서 역할은 계정 속성이 아니라
 * **이 기기의 지금 상태**다. 서버에 보내지 않는다.
 *
 * `childProfileId` 는 아이 모드일 때 누구로 보고 있는지다. 형제가 있으면 갈린다.
 */
export type Mode = "parent" | "kid";

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
