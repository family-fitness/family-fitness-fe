"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 아이가 고른 자기 캐릭터 모습.
 *
 * 서버는 아바타를 모른다 — 측정·미션과 달리 이건 기록이 아니라 취향이다.
 * 기기에 남기고, 고르지 않았으면 프로필에서 자동으로 뽑은 모습을 쓴다.
 *
 * ▲ 기기를 바꾸면 처음 모습으로 돌아간다. 백엔드에 프로필당 아바타 한 줄을
 * 저장해 달라고 요청해 두면 그때 이 저장소를 버린다.
 */
export interface AvatarChoice {
  hair?: string;
  face?: string;
  body?: string;
}

interface AvatarState {
  byProfile: Record<string, AvatarChoice>;
  /** 한 부품만 바꾼다. 나머지는 그대로 둔다 */
  put: (profileId: string, part: keyof AvatarChoice, name: string) => void;
  reset: (profileId: string) => void;
}

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      byProfile: {},
      put: (profileId, part, name) =>
        set((s) => ({
          byProfile: {
            ...s.byProfile,
            [profileId]: { ...s.byProfile[profileId], [part]: name },
          },
        })),
      reset: (profileId) =>
        set((s) => {
          const next = { ...s.byProfile };
          delete next[profileId];
          return { byProfile: next };
        }),
    }),
    { name: "ff-avatar" },
  ),
);
