"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 진행 중인 타이머. */
interface TimerState {
  /** 미션 id → 시작 시각(ISO). 없으면 안 돌고 있다 */
  startedAt: Record<string, string>;
  start: (missionId: string) => void;
  stop: (missionId: string) => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set) => ({
      startedAt: {},
      start: (missionId) =>
        set((s) => ({ startedAt: { ...s.startedAt, [missionId]: new Date().toISOString() } })),
      stop: (missionId) =>
        set((s) => {
          const next = { ...s.startedAt };
          delete next[missionId];
          return { startedAt: next };
        }),
    }),
    { name: "ff-timer" },
  ),
);
