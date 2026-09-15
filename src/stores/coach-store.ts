"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 코치 실행 id 를 가족별로 기억한다.
 *
 * 서버에 "최신 실행 조회" 엔드포인트가 없다 — GET /coach/runs/{runId} 뿐이다.
 * 실행을 시작한 화면이 id 를 들고 있어야 다른 화면(홈 배지)에서도 상태를 볼 수 있다.
 *
 * ▲ 백엔드에 GET /families/{familyId}/coach/runs/latest 를 요청해 뒀다.
 *   생기면 이 스토어는 지운다.
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
