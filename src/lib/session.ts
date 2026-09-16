"use client";

import { useMemo } from "react";

import { useMe } from "./api/queries";
import type { ProfileSummary } from "./api/types";
import { useSessionStore } from "@/stores/session-store";

/** 지금 보고 있는 프로필과 그 가족. */
export function useSession() {
  const { data, isPending, error } = useMe();
  const currentProfileId = useSessionStore((s) => s.currentProfileId);
  const setCurrentProfile = useSessionStore((s) => s.setCurrentProfile);

  const profiles = useMemo<ProfileSummary[]>(() => data?.profiles ?? [], [data]);

  const profile = useMemo(
    () => profiles.find((p) => p.profileId === currentProfileId) ?? profiles[0],
    [profiles, currentProfileId],
  );

  return {
    isPending,
    error,
    userId: data?.userId,
    /** 앱 진입 시 어디로 보낼지 — CREATE_FAMILY · CLAIM · HOME */
    nextStep: data?.nextStep,
    profiles,
    profile,
    familyId: profile?.familyId,
    /** 자녀 화면인지. 부모가 보는 정보(백분위 · 약점)를 그대로 보여주지 않는다 */
    isChild: profile?.role === "CHILD",
    setCurrentProfile,
  };
}
