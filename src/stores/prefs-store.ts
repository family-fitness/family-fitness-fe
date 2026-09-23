"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 이 기기에서 고른 보기 방식. 서버가 알 까닭이 없는 것만 둔다.
 *
 * 부모 폰 하나를 식구가 같이 쓰니 사람이 아니라 **기기**의 값이다.
 */
export type ChartView = "3d" | "flat";

interface PrefsState {
  /** 체력 그래프 — 입체 기둥 / 평면 육각형 */
  chartView: ChartView;
  setChartView: (view: ChartView) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      chartView: "3d",
      setChartView: (chartView) => set({ chartView }),
    }),
    { name: "ff-prefs" },
  ),
);
