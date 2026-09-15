"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { setAccessToken } from "@/lib/api/client";

/**
 * 로그인 토큰.
 *
 * 액세스 토큰은 client.ts 가 메모리에 들고 요청마다 붙인다. 여기서는 새로고침
 * 뒤에도 다시 붙일 수 있도록 보관만 한다.
 *
 * ▲ 토큰을 localStorage 에 두는 건 XSS 에 약하다. 백엔드가 HttpOnly 쿠키로
 *   내려줄 수 있는지 물어봐 뒀다. 그때까지는 이 방식으로 간다 —
 *   같은 출처로 프록시하고 있어서 쿠키로 바꾸는 순간 이 파일만 지우면 된다.
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
      name: "ff-auth",
      // 저장소에서 되살아나는 순간 client 에도 다시 붙여 준다.
      // 이게 없으면 새로고침 직후 첫 요청이 401 로 떨어진다
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
      },
    },
  ),
);
