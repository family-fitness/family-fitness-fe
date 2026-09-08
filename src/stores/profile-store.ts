"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 지금 보고 있는 프로필.
 *
 * 계정(user)과 사람(profile)은 다르다. 부모 계정 하나가 온 가족 프로필을 관리하므로,
 * "지금 누구 화면을 보고 있는가"를 따로 들고 있어야 한다.
 *
 * 서버 데이터를 여기에 캐싱하지 않는다. id 만 둔다 (AGENTS.md).
 */
interface ProfileState {
  currentProfileId: string | null;
  setCurrentProfile: (profileId: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      currentProfileId: null,
      setCurrentProfile: (profileId) => set({ currentProfileId: profileId }),
    }),
    { name: "ff-current-profile" },
  ),
);
