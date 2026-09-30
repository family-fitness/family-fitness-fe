"use client";

import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ui/error-state";
import { ApiError } from "@/lib/api/client";
import { useSignOut } from "@/lib/session";

/**
 * 누구인지 · 어느 가족인지 못 받은 첫 화면(스플래시 · 역할 고르기 · 첫 시작) — 화면 하나를 다 쓴다.
 *
 * 다시 불러오기를 주고, 막혔거나 없는 계정(403 · 404)이면 다시 불러도 같으니 로그아웃을 둔다.
 * 홈 화면에 얹은 앱에는 브라우저 뒤로가 없어 이 화면에서 나갈 길이 없으면 갇힌다.
 */
export function SessionError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const router = useRouter();
  const signOut = useSignOut();
  const settled = error instanceof ApiError && (error.status === 403 || error.status === 404);

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5">
      <h1 className="sr-only">우리가족 체력키움</h1>
      <ErrorState error={error} onRetry={onRetry} retrying={retrying} />
      {settled && (
        <button
          type="button"
          onClick={() => {
            router.replace("/login");
            signOut();
          }}
          className="press text-ink-soft mx-auto min-h-11 px-4 text-sm font-bold"
        >
          로그아웃
        </button>
      )}
    </div>
  );
}
