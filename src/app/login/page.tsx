"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { KiumIsland } from "@/components/scene/kium-island";
import type { AuthResponse } from "@/lib/api/types";
import { errorMessage } from "@/lib/errors";
import { useDevLogin, useGoogleLogin } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 개발용 계정 셋.
 *
 * **「가족 없음」 이 없어서 여태 가입 경로를 한 번도 못 걸어 봤다.** 시연 계정으로만
 * 앱이 돌고 있었고, 처음 쓰는 사람이 겪는 화면은 아무도 안 봤다.
 */
const DEV_ACCOUNTS = [
  { id: "demo-fresh", label: "새 계정 · 가족 없음" },
  { id: "demo-parent", label: "은영 · 가족 3명" },
  { id: "demo-newcomer", label: "초대받은 계정" },
];

/** 구글이 돌아올 자리. 인가코드는 이 주소로 붙어서 온다 */
const REDIRECT_PATH = "/login";

/** 빌드 때 박히는 값이라 렌더마다 다시 볼 필요가 없다 */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/**
 * 개발용 계정을 내는가 — 개발 서버이거나 목 서버를 켠 빌드. 목 서버 빌드에서 이게 없으면
 * 구글 키도 백엔드도 없어 들어갈 길이 하나도 없다.
 */
const DEV_LOGIN =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/**
 * 구글에 가기 전 이 탭에 남기는 것 — 돌아올 때 맞춰 볼 표(state)와 들고 가는 초대코드.
 * 표가 맞지 않으면 코드를 바꾸지 않는다: 남이 만든 로그인 링크로 남의 계정에 들어가지 않게.
 */
const OAUTH_KEY = "ff-oauth";

function rememberOAuth(claimCode: string | undefined): string {
  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem(OAUTH_KEY, JSON.stringify({ state, claimCode }));
  } catch {
    // 저장이 안 되면 돌아와서 표를 못 맞춘다 — 그때는 다시 누르게 된다
  }
  return state;
}

function takeOAuth(): { state?: string; claimCode?: string } | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_KEY);
    sessionStorage.removeItem(OAUTH_KEY);
    return raw ? (JSON.parse(raw) as { state?: string; claimCode?: string }) : null;
  } catch {
    return null;
  }
}

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
  const state = params.get("state");
  // 초대 링크로 들어왔다가 로그인하는 경우. 코드를 같이 넘겨야 바로 프로필에 붙는다
  const claimCode = params.get("claimCode") ?? undefined;
  /**
   * 로그인하고 갈 곳 — 초대코드를 들고 왔고 아직 가족에 붙지 않았으면 그 코드를 넣는 화면으로.
   * 로그인하며 서버가 코드로 붙여 줬으면(참여 방식 · 홈) 스플래시가 단계대로 보낸다 — 코드 화면으로 가면
   * 방금 쓴 코드라며 막혔다
   */
  const after = (auth: AuthResponse, claim: string | undefined) =>
    claim && auth.nextStep !== "SUPPORT_MODE" && auth.nextStep !== "HOME"
      ? `/claim?code=${encodeURIComponent(claim)}`
      : "/";
  /** 인가코드는 한 번만 쓸 수 있다 — 개발 모드에서 effect 가 두 번 돌아도 한 번만 바꾼다 */
  const exchanged = useRef<string | null>(null);

  // 구글에서 돌아왔다. 표를 맞춰 보고, 인가코드를 백엔드에 넘겨 토큰으로 바꾼다
  useEffect(() => {
    if (!code || exchanged.current === code) return;
    exchanged.current = code;
    const saved = takeOAuth();
    const exchange =
      saved?.state && saved.state === state
        ? googleLogin.mutateAsync({
            authorizationCode: code,
            redirectUri: `${window.location.origin}${REDIRECT_PATH}`,
            claimCode: saved.claimCode,
          })
        : Promise.reject(new Error("state mismatch"));
    exchange
      .then((auth) => {
        signIn(auth);
        router.replace(after(auth, saved?.claimCode));
      })
      .catch((e) => setError(errorMessage(e, "로그인하지 못했어요.")));
    // googleLogin 은 매 렌더 새 객체다. 코드가 바뀔 때만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, state]);

  const enter = async (providerUserId: string) => {
    setError(null);
    try {
      const auth = await devLogin.mutateAsync(providerUserId);
      signIn(auth);
      router.replace(after(auth, claimCode));
    } catch (e) {
      setError(errorMessage(e, "들어가지 못했어요."));
    }
  };

  /** 구글 인가 요청. 코드 교환은 백엔드가 한다 — 시크릿이 브라우저에 오면 안 된다 */
  const googleButton = (
    <Button
      size="block"
      loading={googleLogin.isPending}
      onClick={() => {
        const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
        url.searchParams.set("redirect_uri", `${window.location.origin}${REDIRECT_PATH}`);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "openid email profile");
        url.searchParams.set("state", rememberOAuth(claimCode));
        window.location.assign(url.toString());
      }}
    >
      구글로 시작하기
    </Button>
  );

  return (
    <PlainScreen className="flex min-h-dvh flex-col justify-center gap-8">
      <div className="flex flex-col items-center text-center">
        <KiumIsland
          stage={3}
          level={9}
          plants={16}
          seed="kium-login"
          cheer
          spin="auto"
          height={250}
          label="키움 섬 — 운동한 날마다 나무가 하나씩 자라요"
        />
        <h1 className="page-title -mt-1">우리가족 체력키움</h1>
      </div>

      {/* 구글 키가 없으면 구글 단추를 두지 않는다 — 눌리지 않는 회색 단추 앞에서 처음 여는 사람이 멈춘다 */}
      <div className="space-y-3">
        {GOOGLE_CLIENT_ID && googleButton}

        {DEV_LOGIN && (
          <div className="card space-y-2">
            <p className="text-ink-soft text-caption font-bold">개발용 · 구글 없이 들어가기</p>
            {DEV_ACCOUNTS.map((account, i) => {
              const primary = !GOOGLE_CLIENT_ID && i === 0;
              return (
                <Button
                  key={account.id}
                  size="md"
                  variant={primary ? "primary" : "outline"}
                  className="w-full"
                  loading={devLogin.isPending}
                  onClick={() => enter(account.id)}
                >
                  <span className="min-w-0 flex-1 text-left">{account.label}</span>
                </Button>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="text-signal-deep text-center text-sm font-semibold">
            {error}
          </p>
        )}
      </div>
    </PlainScreen>
  );
}
