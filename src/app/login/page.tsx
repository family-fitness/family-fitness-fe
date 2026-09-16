"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { ApiError } from "@/lib/api/client";
import { useDevLogin, useGoogleLogin } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";

/** 로그인. */
const DEV_ACCOUNTS = [
  { id: "demo-parent", label: "데모네 부모 (가족 3명)" },
  { id: "demo-parent-2", label: "초대받는 계정 (프로필 없음)" },
];

/** 구글이 돌아올 자리. 인가코드는 이 주소로 붙어서 온다 */
const REDIRECT_PATH = "/login";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const signIn = useAuthStore((s) => s.signIn);
  const devLogin = useDevLogin();
  const googleLogin = useGoogleLogin();
  const [error, setError] = useState<string | null>(null);

  const code = params.get("code");
  // 초대 링크로 들어왔다가 로그인한 경우. 코드를 같이 넘겨야 바로 프로필에 붙는다
  const claimCode = params.get("claimCode") ?? undefined;

  // 구글에서 돌아왔다. 인가코드를 백엔드에 넘겨 토큰으로 바꾼다
  useEffect(() => {
    if (!code || googleLogin.isPending || googleLogin.isSuccess) return;
    googleLogin
      .mutateAsync({
        authorizationCode: code,
        redirectUri: `${window.location.origin}${REDIRECT_PATH}`,
        claimCode,
      })
      .then((auth) => {
        signIn(auth);
        router.replace("/");
      })
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.userMessage : "로그인하지 못했어요. 다시 시도해 주세요.",
        ),
      );
    // googleLogin 은 매 렌더 새 객체다. 코드가 바뀔 때만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, claimCode]);

  const enter = async (providerUserId: string) => {
    setError(null);
    try {
      const auth = await devLogin.mutateAsync(providerUserId);
      signIn(auth);
      router.replace("/");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.userMessage : "들어가지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  };

  return (
    <PlainScreen className="flex min-h-dvh flex-col justify-center gap-8">
      <div className="flex flex-col items-center text-center">
        <Illustration name="move/move-jump-rope" size={150} />
        <h1 className="page-title mt-4">우리가족 체력키움</h1>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">
          국민체력100 측정 기록으로 가족이 함께할 한 주를 짜 드려요.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          size="block"
          onClick={() => {
            // 구글 인가코드 교환은 백엔드가 한다. 여기서는 구글로 보내기만 한다
            const redirectUri = `${window.location.origin}/login`;
            router.push(`/api/v1/auth/google/start?redirectUri=${encodeURIComponent(redirectUri)}`);
          }}
        >
          구글로 시작하기
        </Button>

        {process.env.NODE_ENV === "development" && (
          <div className="border-line space-y-2 rounded-xl border p-3">
            <p className="text-faint text-caption font-bold">개발용 · 구글 없이 들어가기</p>
            {DEV_ACCOUNTS.map((account) => (
              <Button
                key={account.id}
                size="md"
                variant="outline"
                className="w-full"
                loading={devLogin.isPending}
                onClick={() => enter(account.id)}
              >
                {account.label}
              </Button>
            ))}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}
      </div>

      <p className="text-faint text-caption text-center leading-relaxed">
        국민체력100 측정 데이터를 바탕으로 한 참고 정보입니다. 질병의 진단·치료를 위한 것이
        아닙니다.
      </p>
    </PlainScreen>
  );
}
