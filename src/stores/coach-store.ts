"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 코치 실행 id 를 가족별로 기억한다.
 * ▲ 백엔드에 GET /families/{familyId}/coach/runs/latest 를 요청해 뒀다.
 */
interface CoachState {
  runIdByFamily: Record<string, string>;
  setRunId: (familyId: string, runId: string) => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      runIdByFamily: {},
      setRunId: (familyId, runId) =>
        set((s) => ({ runIdByFamily: { ...s.runIdByFamily, [familyId]: runId } })),
    }),
    { name: "ff-coach-run" },
  ),
);

export function useCoachRunId(familyId: string | undefined): string | undefined {
  return useCoachStore((s) => (familyId ? s.runIdByFamily[familyId] : undefined));
}
