"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_STORAGE_KEY, setAccessToken, setTokenSink } from "@/lib/api/client";

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

// 401 뒤에 새로 받은 토큰을 저장소에도 남긴다 — 새로고침해도 새 토큰으로 이어지게
setTokenSink(({ accessToken, refreshToken }) =>
  useAuthStore.setState({ accessToken, refreshToken }),
);
