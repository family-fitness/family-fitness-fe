"use client";

import { create } from "zustand";

/**
 * 부모가 마지막으로 연 탭의 첫 화면. 탭에서 들어간 화면(운동 짜기, 캘린더)의 뒤로가 그 탭으로 간다.
 * 운동 탭에서 운동 짜기를 열고 뒤로를 누르면 홈이 아니라 운동 탭이다.
 * 이 기기에 남기지 않는다. 새로 열면 홈부터다
 */
export const useTabStore = create<{ last: string; setLast: (href: string) => void }>()((set) => ({
  last: "/parent",
  setLast: (last) => set({ last }),
}));
