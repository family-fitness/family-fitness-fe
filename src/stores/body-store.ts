"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 마지막으로 적어 둔 키 · 몸무게.
 *
 * 서버는 측정과 함께 받아 저장하지만 `latest` 로 돌려주지 않는다.
 * 그래서 방금 적은 값이 저장하자마자 화면에서 사라지곤 했다.
 * 돌려주기 시작하면 이 저장소를 버린다.
 * ▲ 백엔드에 `latest` 응답의 `heightCm` · `weightKg` 를 요청해 뒀다.
 */
interface LastBody {
  heightCm: number;
  weightKg: number;
  /** 잰 날. 오래된 값을 그대로 실어 보내지 않으려고 같이 둔다 */
  measuredOn: string;
}

interface BodyState {
  byProfile: Record<string, LastBody>;
  set: (profileId: string, body: LastBody) => void;
  clear: (profileId: string) => void;
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set) => ({
      byProfile: {},
      set: (profileId, body) => set((s) => ({ byProfile: { ...s.byProfile, [profileId]: body } })),
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
