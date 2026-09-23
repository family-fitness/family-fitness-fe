"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 이 기기에서 고른 보기 방식. 서버가 알 까닭이 없는 것만 둔다.
 *
 * 부모 폰 하나를 식구가 같이 쓰니 사람이 아니라 **기기**의 값이다.
 */
export type ChartView = "3d" | "flat";
/** 가족 다리 목표(분) — 주말 30분부터 시작하는 집을 위해 60분이 가장 작다 */
export const FAMILY_GOALS = [60, 90, 120] as const;
export type FamilyGoal = (typeof FAMILY_GOALS)[number];

interface PrefsState {
  /** 체력 그래프 — 입체 기둥 / 평면 육각형 */
  chartView: ChartView;
  setChartView: (view: ChartView) => void;
  /** 운동하기 소리 안내 — 「시작!」 「10초 남았어요」 「셋 · 둘 · 하나」 */
  voice: boolean;
  setVoice: (on: boolean) => void;
  /** 이번 주 가족 다리 목표. ▲ 요청: 가족 목표를 서버에(기기가 바뀌어도 남게) */
  familyGoal: FamilyGoal;
  setFamilyGoal: (goal: FamilyGoal) => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      chartView: "3d",
      setChartView: (chartView) => set({ chartView }),
      voice: true,
      setVoice: (voice) => set({ voice }),
      familyGoal: 90,
      setFamilyGoal: (familyGoal) => set({ familyGoal }),
    }),
    { name: "ff-prefs" },
  ),
);
