"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 진행 중인 타이머.
 *
 * 화면을 벗어나도 계속 돌아야 한다 — 운동하다 영상을 보러 갔다 오는 게 정상이다.
 * 그래서 남은 시간을 매초 저장하지 않고 **시작 시각만** 저장한다.
 * 그러면 앱이 꺼졌다 켜져도 경과 시간이 맞는다.
 */
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
