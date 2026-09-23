"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 이 기기에서 고른 보기 방식. 서버가 알 까닭이 없는 것만 둔다.
 *
 * 부모 폰 하나를 식구가 같이 쓰니 사람이 아니라 **기기**의 값이다.
 */
export type ChartView = "3d" | "flat";
/** 부모 홈에서 숨길 수 있는 카드 — 체력 · 오늘 운동 · 알려 줄 것은 숨기지 않는다(이 앱이 하는 일이다) */
export const HOME_CARDS = [
  { id: "recap", name: "지난주 돌아보기", line: "한 주가 시작되면 지난주를 짧게" },
  { id: "week", name: "이번 주", line: "요일마다 움직인 분" },
  { id: "bridge", name: "우리 가족 다리", line: "가족이 같이 채우는 이번 주 목표" },
  { id: "finder", name: "키우고 싶은 힘으로 찾기", line: "운동 찾기로 가는 길" },
  { id: "family", name: "가족", line: "구성원 · 초대" },
] as const;
export type HomeCard = (typeof HOME_CARDS)[number]["id"];
/** 숨긴 카드가 없을 때 — 늘 같은 배열을 돌려준다(고를 때마다 새 배열이면 다시 그리기가 멈추지 않는다) */
const SHOW_ALL: HomeCard[] = [];

/** 부모 홈에서 숨긴 카드. 예전에 저장한 값에 칸이 없어도 늘 배열 */
export const selectHidden = (s: { homeHidden?: unknown }): HomeCard[] =>
  Array.isArray(s.homeHidden) ? (s.homeHidden as HomeCard[]) : SHOW_ALL;

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
  /** 홈 편집 — 부모 홈에서 숨긴 카드 */
  homeHidden: HomeCard[];
  toggleHomeCard: (card: HomeCard) => void;
  /** 아이마다 지난주 돌아보기를 닫은 주(그 주 월요일). 다음 주가 되면 다시 뜬다 */
  recapClosed: Record<string, string>;
  closeRecap: (profileId: string, week: string) => void;
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
      homeHidden: [],
      toggleHomeCard: (card) =>
        set((s) => {
          const hidden = Array.isArray(s.homeHidden) ? s.homeHidden : [];
          return {
            homeHidden: hidden.includes(card)
              ? hidden.filter((c) => c !== card)
              : [...hidden, card],
          };
        }),
      recapClosed: {},
      closeRecap: (profileId, week) =>
        set((s) => ({
          // 예전에 한 값(아이 구분 없는 글자)이 남아 있으면 버리고 아이마다 새로 적는다
          recapClosed: {
            ...(s.recapClosed && typeof s.recapClosed === "object" ? s.recapClosed : {}),
            [profileId]: week,
          },
        })),
    }),
    { name: "ff-prefs" },
  ),
);
