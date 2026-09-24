"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 이 기기에서 고른 것. 서버가 알 까닭이 없는 것만 둔다.
 *
 * 부모 폰 하나를 식구가 같이 쓰니 사람이 아니라 **기기**의 값이다.
 */
interface PrefsState {
  /** 운동하기 소리 안내 — 「시작!」 「10초 남았어요」 「셋 · 둘 · 하나」 */
  voice: boolean;
  setVoice: (on: boolean) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      voice: true,
      setVoice: (voice) => set({ voice }),
    }),
    { name: "ff-prefs" },
  ),
);
