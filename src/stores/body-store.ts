"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 아직 서버에 못 보낸 키 · 몸무게.
 * ▲ 백엔드에 `PATCH /profiles/{profileId}/body {heightCm, weightKg}` 를 요청해 뒀다.
 */
interface PendingBody {
  heightCm: number;
  weightKg: number;
  /** 잰 날. 오래된 값을 그대로 실어 보내지 않으려고 같이 둔다 */
  measuredOn: string;
}

interface BodyState {
  byProfile: Record<string, PendingBody>;
  set: (profileId: string, body: PendingBody) => void;
  take: (profileId: string) => PendingBody | undefined;
  clear: (profileId: string) => void;
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set, get) => ({
      byProfile: {},
      set: (profileId, body) => set((s) => ({ byProfile: { ...s.byProfile, [profileId]: body } })),
      take: (profileId) => get().byProfile[profileId],
      clear: (profileId) =>
        set((s) => {
          const next = { ...s.byProfile };
          delete next[profileId];
          return { byProfile: next };
        }),
    }),
    { name: "ff-body" },
  ),
);
