"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { api } from "./api/client";
import { useMe } from "./api/queries";
import { resetDevice } from "@/stores/device";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 지금 로그인한 사람과 그 가족.
 *
 * 「나」 는 이 계정의 프로필이다. `/me` 는 이 계정이 **관리하는** 프로필을 주므로 부모 계정이면 자기 계정이 없는
 * 아이 프로필이 같이 올 수 있다(규칙 7). 첫째 줄을 그냥 나로 보면, 아이가 먼저 온 날 부모가 아이 화면으로 튕긴다 —
 * 보호자 프로필이 있으면 그것이 나다. 자녀 계정에는 자기 프로필 하나뿐이다.
 */
export function useSession() {
  const { data, isPending, error, refetch } = useMe();

  const profile = useMemo(() => {
    const profiles = data?.profiles ?? [];
    return profiles.find((p) => p.role === "PARENT") ?? profiles[0];
  }, [data]);

  return {
    isPending,
    // 받아 둔 `/me` 가 있으면 다시 받다 실패해도 그걸로 그린다 — 밤을 넘겨 다시 받다 망이 끊기면
    // 멀쩡히 보던 화면이 오류 화면으로 바뀌었다
    error: data ? null : error,
    /** `/me` 를 다시 부른다 — 이게 실패했을 때 다른 조회를 다시 불러 봐야 소용없다 */
    refetch,
    /** 앱 진입 시 어디로 보낼지 — CREATE_FAMILY · CLAIM · SUPPORT_MODE · HOME */
    nextStep: data?.nextStep,
    profile,
    familyId: profile?.familyId,
  };
}

/**
 * 이 기기에서 나간다 — 토큰, 이 기기에만 둔 것(역할 · 아이 사진 · 키 몸무게 · 짜던 운동), 받아 둔 서버 값까지.
 * 받아 둔 값을 남기면 다음에 들어온 계정이 첫 화면에서 앞 계정의 `/me` 로 길을 정한다.
 *
 * 서버의 로그인 유지 토큰도 끊는다(`revoke`, 기본). 이 기기에서만 지우면 그 리프레시 토큰은 30일 동안 살아 있어,
 * 어딘가 남은 토큰으로 계속 새 접속 토큰을 받을 수 있었다. 탈퇴는 끊지 않는다 — 서버가 토큰 기록까지 지운다
 */
export function useSignOut() {
  const qc = useQueryClient();
  return ({ revoke = true }: { revoke?: boolean } = {}) => {
    const refreshToken = useAuthStore.getState().refreshToken;
    useAuthStore.getState().signOut({ forget: true });
    resetDevice();
    void qc.cancelQueries();
    qc.removeQueries();
    if (revoke && refreshToken) revokeOnServer(refreshToken);
  };
}

/**
 * 그 로그인 묶음을 서버에서 끊는다. 공개 경로라 접속 토큰 없이 부르고, 서버는 모르는 토큰이어도 204 다.
 * 기다리지 않는다 — 화면은 바로 떠나고, 실패해도 이 기기는 이미 로그아웃했다
 */
function revokeOnServer(refreshToken: string) {
  void api.post<void>("/auth/logout", { refreshToken }).catch(() => undefined);
}
