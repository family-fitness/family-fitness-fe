"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 프로필 사진 — 사람마다 한 장(9/25 「프로필 사진 등록」).
 *
 * 서버에 사진 자리가 아직 없어 **이 기기에만** 둔다(정사각 320px JPEG, 한 장에 수십 KB).
 * 아이 사진이라 밖으로 내보내지 않는 것이 먼저다 — 서버 자리가 생기면(BACKEND_ASKS) 동의를 받고 올린다.
 */
interface PhotoState {
  byProfile: Record<string, string>;
  set: (profileId: string, dataUrl: string) => void;
  remove: (profileId: string) => void;
}

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set) => ({
      byProfile: {},
      set: (profileId, dataUrl) =>
        set((s) => ({ byProfile: { ...s.byProfile, [profileId]: dataUrl } })),
      remove: (profileId) =>
        set((s) => {
          const next = { ...s.byProfile };
          delete next[profileId];
          return { byProfile: next };
        }),
    }),
    { name: "ff-photos" },
  ),
);

/** 이 사람의 사진. 없으면 undefined */
export function usePhoto(profileId: string | null | undefined): string | undefined {
  return usePhotoStore((s) => (profileId ? s.byProfile[profileId] : undefined));
}
