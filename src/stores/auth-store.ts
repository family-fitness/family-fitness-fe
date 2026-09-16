"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_STORAGE_KEY, setAccessToken } from "@/lib/api/client";

/**
 * 로그인 토큰.
 * ▲ localStorage 는 XSS 에 약하다. 백엔드에 HttpOnly 쿠키를 요청해 뒀다.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  signIn: (tokens: { accessToken?: string; refreshToken?: string }) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      signIn: ({ accessToken, refreshToken }) => {
        setAccessToken(accessToken ?? null);
        set({ accessToken: accessToken ?? null, refreshToken: refreshToken ?? null });
      },
      signOut: () => {
        setAccessToken(null);
        set({ accessToken: null, refreshToken: null });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      // 저장소에서 되살아나는 순간 client 에도 다시 붙여 준다.
      // 이게 없으면 새로고침 직후 첫 요청이 401 로 떨어진다
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
      },
    },
  ),
);
