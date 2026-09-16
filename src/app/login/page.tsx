"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { errorMessage } from "@/lib/errors";
import { useDevLogin, useGoogleLogin } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";

/** 로그인. */
const DEV_ACCOUNTS = [
  { id: "demo-parent", label: "은영 · 가족 3명" },
  { id: "demo-newcomer", label: "초대받는 계정 · 프로필 없음" },
];

/** 구글이 돌아올 자리. 인가코드는 이 주소로 붙어서 온다 */
const REDIRECT_PATH = "/login";

/** 빌드 때 박히는 값이라 렌더마다 다시 볼 필요가 없다 */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

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
      .catch((e) => setError(errorMessage(e, "로그인하지 못했어요. 다시 시도해 주세요.")));
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
      setError(errorMessage(e, "들어가지 못했어요. 잠시 후 다시 시도해 주세요."));
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
          variant={GOOGLE_CLIENT_ID ? "primary" : "outline"}
          disabled={!GOOGLE_CLIENT_ID}
          loading={googleLogin.isPending}
          onClick={() => {
            // 인가 요청은 프론트가 하고 코드 교환은 백엔드가 한다.
            // 클라이언트 시크릿이 브라우저에 오면 안 된다
            const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
            url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
            url.searchParams.set("redirect_uri", `${window.location.origin}${REDIRECT_PATH}`);
            url.searchParams.set("response_type", "code");
            url.searchParams.set("scope", "openid email profile");
            if (claimCode) url.searchParams.set("state", claimCode);
            window.location.assign(url.toString());
          }}
        >
          구글로 시작하기
        </Button>

        {/* 눌러 봐야 아는 것보다 미리 말해 주는 편이 낫다 */}
        {!GOOGLE_CLIENT_ID && (
          <p className="text-faint text-caption text-center">
            구글 로그인 키가 아직 없어요. 아래로 들어가 주세요.
          </p>
        )}

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
