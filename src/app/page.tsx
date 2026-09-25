"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LevelBuddy } from "@/components/domain/level-buddy";
import { ErrorState } from "@/components/ui/error-state";
import { ApiError } from "@/lib/api/client";
import { useMe } from "@/lib/api/queries";
import { useSignOut } from "@/lib/session";
import { useAuthStore } from "@/stores/auth-store";
import { useRoleStore } from "@/stores/role-store";

/** 스플래시 — 토큰과 `/me` 를 보고 갈 곳을 정한다. */
export default function SplashPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const mode = useRoleStore((s) => s.mode);
  const { data, error, refetch, isRefetching } = useMe();
  const signOut = useSignOut();
  // 로그인이 풀린 것만 로그인 화면으로. 망이 끊기거나 서버가 넘어졌을 때 보내면 다시 들어와도 같은 자리다
  const signedOut = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (token) return;
    // persist 가 되살아나기 전에는 토큰이 null 이다. 한 틱 기다린다
    const id = setTimeout(() => {
      if (useAuthStore.getState().accessToken) return;
      router.replace("/login");
    }, 600);
    return () => clearTimeout(id);
  }, [token, router]);

  useEffect(() => {
    if (signedOut) router.replace("/login");
  }, [signedOut, router]);

  useEffect(() => {
    if (!data) return;

    /*
      가족이 아직 없거나 초대를 받아야 하면 그쪽이 먼저다.

      전에는 `CREATE_FAMILY` 를 역할 고르기(`/start`)로 보냈다. 가족도 아이도 없는데
      「아이」 를 고를 수 있는 화면이 먼저 뜨는 건 말이 안 된다 — 고를 자리가 없다.
      가족 만들기로 곧장 보낸다.
    */
    if (data.nextStep === "CREATE_FAMILY") {
      router.replace("/start/family");
      return;
    }
    if (data.nextStep === "CLAIM") {
      router.replace("/claim");
      return;
    }
    // 초대를 받아 들어왔다가 참여 방식을 고르기 전에 닫았다 — 고르던 자리로
    if (data.nextStep === "SUPPORT_MODE") {
      router.replace("/settings/support-mode?from=claim");
      return;
    }

    // 역할을 고른 적이 있으면 바로 그 홈으로. 없으면 고르는 화면으로. 단계를 안 주면 홈으로 본다
    router.replace(mode === "kid" ? "/kid" : mode === "parent" ? "/parent" : "/start");
  }, [data, mode, router]);

  if (error && !signedOut) {
    // 막혔거나 없는 계정(403 · 404)은 다시 불러도 같다 — 다시 불러오기도 없이 갇혔다. 다른 계정으로 갈 길을 둔다
    const settled = error instanceof ApiError && (error.status === 403 || error.status === 404);
    return (
      <div className="flex min-h-dvh flex-col justify-center px-5">
        <h1 className="sr-only">우리가족 체력키움</h1>
        <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />
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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LevelBuddy stage={3} size={140} />
      <h1 className="page-title text-center">우리가족 체력키움</h1>
    </div>
  );
}
