"use client";

import { create } from "zustand";

/**
 * 코치 창이 열려 있나.
 *
 * 창 자체는 화면 오른쪽 아래에 늘 떠 있는데, **다른 화면의 줄에서도 열 수
 * 있어야** 한다. 부모 홈의 "코치에게 묻기" 가 그렇다. 전에는 그 줄이 별도
 * 화면(`/coach/chat`)으로 갔고, 그 화면은 창과 거의 같은 코드를 한 벌 더
 * 갖고 있으면서 미션 제안 카드만 없었다 — 같은 기능의 못한 복사본이었다.
 *
 * 저장하지 않는다. 새로고침하면 닫힌 상태로 시작하는 게 맞다.
 */
interface ChatState {
  open: boolean;
  /** 누구에 대해 물을지. 비워 두면 창이 고른 아이로 시작한다 */
  aboutProfileId: string | null;
  openChat: (aboutProfileId?: string) => void;
  closeChat: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  open: false,
  aboutProfileId: null,
  openChat: (aboutProfileId) => set({ open: true, aboutProfileId: aboutProfileId ?? null }),
  closeChat: () => set({ open: false }),
}));
