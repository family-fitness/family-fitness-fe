"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Fragment, useEffect, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { today } from "@/lib/today";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 모바일에서 탭을 오갈 때마다 다시 부르면 데이터 요금과 배터리를 쓴다
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // 권한 · 검증 실패는 다시 불러도 똑같다
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // 렌더마다 새 클라이언트를 만들면 캐시가 통째로 날아간다
  const [queryClient] = useState(makeQueryClient);

  /*
    날이 바뀐 채로 돌아오면 받아 둔 것을 다시 받고, 화면도 다시 세운다. 홈 화면 앱은 밤새 열려 있다가 아침에
    다시 보이는데, 창을 다시 볼 때 다시 부르지 않게 해 두어(위) 어제의 「오늘」 링 · 오늘 운동이 그대로 떠 있었다.
    다시 받아도 값이 같으면 화면이 다시 그려지지 않아, 그릴 때 오늘(today())을 읽는 칸은 어제에 머물렀다
  */
  const [day, setDay] = useState(today);
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      const now = today();
      if (now === day) return;
      setDay(now);
      void queryClient.invalidateQueries();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [queryClient, day]);

  return (
    <QueryClientProvider client={queryClient}>
      <Fragment key={day}>{children}</Fragment>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          /* 오른쪽 아래는 화면 아래 단추(Dock) 자리다 — 겹치면 개발 중에 누를 수 없다 */
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
