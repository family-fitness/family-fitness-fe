"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ClipView } from "@/lib/api/types";
import {
  setMinutes as withMinutes,
  shift as shifted,
  tidy as tidied,
  toggleMove,
  type RoutineMove,
} from "@/lib/routine";

/**
 * 짜는 중인 루틴 — 운동 찾기에서 담고, 직접 짜기에서 세운다.
 *
 * 서버가 아직 모르는 것(등록 전)이라 여기에 둔다. 두 화면을 오가도, 새로고침해도 남게
 * 탭 저장소(sessionStorage)에 둔다 — 탭을 닫으면 사라진다. 등록하면 비운다.
 */
interface RoutineState {
  moves: RoutineMove[];
  toggle: (clip: ClipView) => void;
  shift: (index: number, by: -1 | 1) => void;
  setMinutes: (index: number, minutes: number) => void;
  remove: (index: number) => void;
  tidy: () => void;
  clear: () => void;
}

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set) => ({
      moves: [],
      toggle: (clip) => set((s) => ({ moves: toggleMove(s.moves, clip) })),
      shift: (index, by) => set((s) => ({ moves: shifted(s.moves, index, by) })),
      setMinutes: (index, minutes) => set((s) => ({ moves: withMinutes(s.moves, index, minutes) })),
      remove: (index) => set((s) => ({ moves: s.moves.filter((_, i) => i !== index) })),
      tidy: () => set((s) => ({ moves: tidied(s.moves) })),
      clear: () => set({ moves: [] }),
    }),
    { name: "ff-routine", storage: createJSONStorage(() => sessionStorage) },
  ),
);
