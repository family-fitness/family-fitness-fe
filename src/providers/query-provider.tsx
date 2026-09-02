"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/client";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 모바일에서 탭을 오갈 때마다 다시 부르면 데이터 요금과 배터리를 쓴다
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // 권한·검증 실패는 다시 불러도 똑같다
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
