"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 세션 — 지금 보고 있는 사람.
 *
 * 계정(user)과 사람(profile)은 다르다. 부모 계정 하나가 온 가족 프로필을 관리하므로
 * "지금 누구 화면을 보고 있는가"를 따로 들고 있어야 한다.
 *
 * 서버 데이터를 여기에 캐싱하지 않는다. id 만 둔다.
 * 프로필 목록은 GET /me 가 준다.
 */
interface SessionState {
  currentProfileId: string | null;
  setCurrentProfile: (profileId: string) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentProfileId: null,
      setCurrentProfile: (profileId) => set({ currentProfileId: profileId }),
      clear: () => set({ currentProfileId: null }),
    }),
    { name: "ff-session" },
  ),
);
