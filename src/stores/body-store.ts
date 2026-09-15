"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 아직 서버에 못 보낸 키 · 몸무게.
 *
 * 서버는 키와 몸무게를 **측정 회차에 얹어서만** 받는다
 * (`POST /profiles/{id}/fitness-tests` 는 항목이 0개면 400 NO_ITEMS).
 * 그런데 아이를 등록할 때는 키·몸무게만 받고 측정은 나중에 할 수 있다.
 *
 * 그 사이를 이 저장소가 메운다. 첫 측정을 넣을 때 같이 실려 간다.
 *
 * ▲ 백엔드에 `PATCH /profiles/{profileId}/body {heightCm, weightKg}` 를 요청해 뒀다.
 *   생기면 이 파일은 지운다.
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
