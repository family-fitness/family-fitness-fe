"use client";

import { create } from "zustand";

/**
 * 앱 안에서 재는 운동 타이머.
 *
 * 서버가 진짜로 아는 두 가지 중 하나다(나머지 하나는 유튜브 재생 진행률).
 * 화면을 옮겨도 이어져야 하므로 컴포넌트 상태가 아니라 전역에 둔다.
 */
interface TimerState {
  missionId: string | null;
  startedAt: number | null;
  /** 일시정지 이전까지 쌓인 시간(ms) */
  accumulatedMs: number;
  start: (missionId: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  /** 지금까지 잰 시간(ms). 초 단위로 다시 그릴 때 쓴다 */
  elapsedMs: (now: number) => number;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  missionId: null,
  startedAt: null,
  accumulatedMs: 0,

  start: (missionId) => set({ missionId, startedAt: Date.now(), accumulatedMs: 0 }),

  pause: () => {
    const { startedAt, accumulatedMs } = get();
    if (startedAt === null) return;
    set({ startedAt: null, accumulatedMs: accumulatedMs + (Date.now() - startedAt) });
  },

  resume: () => {
    if (get().startedAt !== null) return;
    set({ startedAt: Date.now() });
  },

  reset: () => set({ missionId: null, startedAt: null, accumulatedMs: 0 }),

  elapsedMs: (now) => {
    const { startedAt, accumulatedMs } = get();
    return accumulatedMs + (startedAt === null ? 0 : now - startedAt);
  },
}));
