"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_STORAGE_KEY, setAccessToken, setTokenSink } from "@/lib/api/client";

import { resetDevice } from "./device";

/**
 * 로그인 토큰.
 * ▲ localStorage 는 XSS 에 약하다. 백엔드에 HttpOnly 쿠키를 요청해 뒀다.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  /** 이 기기에 마지막으로 들어온 계정. 다른 계정이 들어오면 기기에 둔 것을 비운다 */
  userId: string | null;
  signIn: (auth: { accessToken?: string; refreshToken?: string; userId?: string }) => void;
  /** 토큰만 버린다. `forget` 이면 누가 들어왔었는지도 잊는다(로그아웃) */
  signOut: (options?: { forget?: boolean }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      signIn: ({ accessToken, refreshToken, userId }) => {
        // 로그아웃 없이 다른 계정이 들어왔다(토큰이 끝난 공용 태블릿) — 앞 계정의 역할 · 아이 사진을 두지 않는다
        const before = get().userId;
        if (userId && before && userId !== before) resetDevice();
        setAccessToken(accessToken ?? null);
        set({
          accessToken: accessToken ?? null,
          refreshToken: refreshToken ?? null,
          userId: userId ?? before,
        });
      },
      signOut: ({ forget = false } = {}) => {
        setAccessToken(null);
        set({ accessToken: null, refreshToken: null, ...(forget ? { userId: null } : {}) });
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
