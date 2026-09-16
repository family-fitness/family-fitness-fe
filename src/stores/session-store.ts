"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 세션 — 지금 보고 있는 사람. */
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
