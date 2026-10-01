"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { ArtIcon } from "@/components/ui/art-icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { KiumIsland } from "@/components/scene/kium-island";
import { errorMessage } from "@/lib/errors";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/legal";
import {
  REVIEW_WAYS,
  UNUSED_INVITE_COPY,
  afterSignIn,
  reviewDestination,
  unusedInvite,
  type ReviewKind,
} from "@/lib/review-login";
import { useDevLogin, useGoogleLogin, useInvitePeek, useReviewLogin } from "@/lib/api/queries";
import { blocksClaim, claimErrorMessage, invitePeekLine, normalizeCode } from "@/lib/invite";
import { WITHDRAWN_NOTICE, cameAfterWithdrawal } from "@/lib/withdrawal";
import { useAuthStore } from "@/stores/auth-store";
import { useRoleStore } from "@/stores/role-store";

/**
 * 개발용 계정 셋.
 *
 * **「가족 없음」 이 없어서 여태 가입 경로를 한 번도 못 걸어 봤다.** 시연 계정으로만
 * 앱이 돌고 있었고, 처음 쓰는 사람이 겪는 화면은 아무도 안 봤다.
 */
const DEV_ACCOUNTS: { id: string; label: string; claimCode?: string }[] = [
  { id: "demo-fresh", label: "가족이 없는 새 계정" },
  { id: "demo-parent", label: "은영, 가족 3명" },
  // 백엔드 시드의 두 번째 부모와 그 자리의 초대코드 — 들어간 뒤 그 코드의 자리 미리 보기로 간다
  { id: "demo-parent-2", label: "초대받은 계정", claimCode: "K7M2QT" },
];

/** 구글이 돌아올 자리. 인가코드는 이 주소로 붙어서 온다 */
const REDIRECT_PATH = "/login";

/** 빌드 때 박히는 값이라 렌더마다 다시 볼 필요가 없다 */
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/**
 * 개발용 계정을 내는가 — 개발 서버, 목 서버를 켠 빌드, 그리고 빌드에 `NEXT_PUBLIC_DEV_LOGIN=enabled` 를
 * 준 경우(로컬 백엔드에 붙여 보는 빌드)뿐이다.
 * 「구글 키가 없으면」 도 열었더니 키를 빠뜨린 실제 서버 빌드에 개발 계정이 떠서, 누구나 같은 개발 계정으로
 * 들어가 앞사람 가족을 볼 수 있었다(9/30 보안 점검). 키가 없으면 들어갈 길이 없는 편이 낫다.
 *
 * 세 조건 모두 process.env 를 그대로 쓴다. 빌드가 이 값을 false 로 풀어야 개발용 계정 목록과
 * 「구글 없이 들어가기」 가 운영 번들에서 빠진다(값은 next.config 의 env 가 빌드할 때 박는다).
 * 변수를 거치면 압축기가 풀지 못해 화면에는 안 보여도 번들에 남았다.
 */
const DEV_LOGIN =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_API_MOCKING === "enabled" ||
  process.env.NEXT_PUBLIC_DEV_LOGIN === "enabled";

/**
 * 구글 키가 없는 개발 빌드(개발 서버, 목 빌드, 개발 로그인을 켠 빌드)에서 「구글로 시작하기」 가 대신 들어가는 계정.
 * 처음 구글로 들어온 사람과 같게, 부를 때마다 가족 없는 새 계정이라 시작 고르기(새 가족 만들기, 초대 코드로 참여하기)부터 걷는다.
 * 개발 로그인이 꺼진 빌드에 구글 키가 없으면 단추를 눌리지 않게 둔다(들어갈 길이 없는 편이 낫다)
 */
const GOOGLE_STAND_IN = "demo-fresh";

/**
 * 대신 들어갈 때도, 심사용 계정으로 들어갈 때도 들어가는 화면을 한 번은 보인다 — 너무 빨라 깜빡이면
 * 무엇이 됐는지 모른다
 */
const STAND_IN_MIN_MS = 900;

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
  const reviewLogin = useReviewLogin();
  const [error, setError] = useState<string | null>(null);
  /**
   * 들어가는 중인 길 — 구글로 떠나는 중 · 구글에서 받은 코드를 바꾸는 중 · 구글 대신 새 계정으로 ·
   * 심사용 계정으로
   */
  const [signing, setSigning] = useState<"google" | "exchange" | "stand-in" | "review" | null>(
    null,
  );

  const code = params.get("code");
  const state = params.get("state");
  /**
   * 초대 링크로 들어왔다가 로그인하는 경우. 코드는 로그인에 싣지 않는다 — 실으면 서버가 로그인과 함께
   * 그 자리에 붙여서, 남이 보낸 링크로 로그인한 사람이 「OO네 · 아빠 자리」 를 보지도 못하고 남의 가족에
   * 들어갔다(9/30 보안 점검). 이 탭에 들고 있다가 로그인한 뒤 그 코드로 합류 화면에 가서, 자리를 보고 직접 누른다.
   */
  const claimCode = normalizeCode(params.get("claimCode") ?? "") || undefined;
  /** 이 빌드에 들어갈 길이 있나 — 구글 키, 아니면 개발 로그인 */
  const canSignIn = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) || DEV_LOGIN;
  /** 「초대 코드가 있어요」 시트 — 링크 없이 코드만 받은 사람이 코드를 넣고 로그인한다 */
  const [inviting, setInviting] = useState(false);
  const [entered, setEntered] = useState("");
  // 넣은 코드가 어느 가족의 초대인지 로그인 전에 본다. ▲ 지금 BE 는 미리 보기를 로그인한 계정에만 열어 401 이 온다.
  // 그러면 미리 보기 없이 코드를 들고 로그인하고, 합류 화면이 미리 보기와 오류를 보인다
  const enteredPeek = useInvitePeek(inviting ? entered : "");
  const linkPeek = useInvitePeek(claimCode ?? "");
  const enteredBlocked = blocksClaim(enteredPeek.error);
  // 설정에서 탈퇴하고 넘어왔다. 한 줄로 알린다
  const withdrawn = cameAfterWithdrawal(params);
  /** 심사용 계정의 세 흐름을 고르는 시트 */
  const [picking, setPicking] = useState(false);
  /**
   * 가족이 있는 계정이 초대 코드를 들고 로그인했다. 로그인은 코드를 쓰지 않아서 전에는 아무 말 없이 버려졌다.
   * 한 번 알리고, 확인을 누르면 갈 주소를 담아 둔다
   */
  const [unused, setUnused] = useState<string | null>(null);
  /** 로그인한 뒤 갈 곳으로. 들고 온 코드가 쓰이지 않았으면 먼저 알린다 */
  const proceed = (auth: Parameters<typeof afterSignIn>[0], withCode: string | undefined) => {
    if (unusedInvite(auth, withCode)) {
      setUnused(afterSignIn(auth, withCode));
      return;
    }
    router.replace(afterSignIn(auth, withCode));
  };
  /** 인가코드는 한 번만 쓸 수 있다 — 개발 모드에서 effect 가 두 번 돌아도 한 번만 바꾼다 */
  const exchanged = useRef<string | null>(null);

  // 구글에서 돌아왔다. 표를 맞춰 보고, 인가코드를 백엔드에 넘겨 토큰으로 바꾼다
  useEffect(() => {
    if (!code || exchanged.current === code) return;
    exchanged.current = code;
    setSigning("exchange");
    const saved = takeOAuth();
    const exchange =
      saved?.state && saved.state === state
        ? googleLogin.mutateAsync({
            authorizationCode: code,
            redirectUri: `${window.location.origin}${REDIRECT_PATH}`,
          })
        : Promise.reject(new Error("state mismatch"));
    exchange
      .then((auth) => {
        signIn(auth);
        proceed(auth, saved?.claimCode);
      })
      .catch((e) => {
        setSigning(null);
        setError(errorMessage(e, "로그인하지 못했어요."));
      });
    // googleLogin 은 매 렌더 새 객체다. 코드가 바뀔 때만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, state]);

  const enter = async (account: (typeof DEV_ACCOUNTS)[number]) => {
    setError(null);
    // 초대 링크로 들고 온 코드가 먼저다
    const claim = claimCode ?? account.claimCode;
    try {
      const auth = await devLogin.mutateAsync({ providerUserId: account.id });
      signIn(auth);
      proceed(auth, claim);
    } catch (e) {
      setError(errorMessage(e, "들어가지 못했어요."));
    }
  };

  /**
   * 구글 인가 요청. 코드 교환은 백엔드가 한다 — 시크릿이 브라우저에 오면 안 된다.
   * 들고 가는 초대 코드는 이 탭에 남겨 두고, 돌아와 로그인한 뒤 그 코드로 합류 화면에 간다
   */
  const toGoogle = (withCode: string | undefined) => {
    setError(null);
    setSigning("google");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", `${window.location.origin}${REDIRECT_PATH}`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", rememberOAuth(withCode));
    window.location.assign(url.toString());
  };

  /**
   * 구글 키가 없는 개발 빌드에서는 구글에 다녀온 셈 치고 새 계정으로 들어간다. 들어가는 화면은 구글과 같다.
   * 초대코드는 로그인에 싣지 않는다(구글 로그인과 같다). 들어간 뒤 코드 화면에서 자리를 보고 누른다
   */
  const standIn = async (withCode: string | undefined) => {
    setError(null);
    setSigning("stand-in");
    try {
      const [auth] = await Promise.all([
        devLogin.mutateAsync({ providerUserId: GOOGLE_STAND_IN }),
        new Promise((done) => setTimeout(done, STAND_IN_MIN_MS)),
      ]);
      signIn(auth);
      proceed(auth, withCode);
    } catch (e) {
      setSigning(null);
      setError(errorMessage(e, "들어가지 못했어요."));
    }
  };

  /**
   * 심사위원이 구글 계정 없이 둘러보는 길. 운영 서버에서도 열려 있다 — 서버가 부를 때마다 새 계정을
   * 만들어 준다. 시트에서 고른 흐름(kind)을 들고 간다. 초대 링크로 들고 온 코드는 들고 가지 않는다.
   *
   *   FAMILY   체험 가족의 보호자로 바로 홈. 역할을 부모로 정해 두지 않으면 처음 보는 기기에서
   *            「누가 쓰고 있나요」 를 한 번 더 거쳤다. 정하는 건 `signIn` 뒤에 — 새 계정이 들어오면
   *            `signIn` 이 기기에 남은 역할을 비운다
   *   FRESH    평소 가입과 같이 스플래시가 시작 고르기(새 가족 만들기, 초대 코드로 참여하기)로 보낸다
   *   INVITED  서버가 준 초대코드를 채운 합류 화면으로
   */
  const review = async (kind: ReviewKind) => {
    setPicking(false);
    setError(null);
    setSigning("review");
    try {
      const [auth] = await Promise.all([
        reviewLogin.mutateAsync(kind),
        new Promise((done) => setTimeout(done, STAND_IN_MIN_MS)),
      ]);
      signIn(auth);
      if (kind === "FAMILY") useRoleStore.getState().setMode("parent");
      router.replace(reviewDestination(auth));
    } catch (e) {
      setSigning(null);
      setError(
        errorMessage(
          e,
          {
            // 같은 곳(IP)에서 한 시간에 30번을 넘기면 서버가 막는다. 지난 한 시간 동안 만든 것만 센다
            TOO_MANY:
              "여기서 심사용 계정을 너무 많이 만들었어요. 한 시간 안에 다시 들어갈 수 있어요.",
          },
          "심사용 계정으로 들어가지 못했어요.",
        ),
      );
    }
  };

  /**
   * 구글로 시작하기 — 구글 키가 없는 개발 빌드는 구글 대신 새 계정으로 같은 길을 걷는다.
   * 개발 로그인이 꺼진 빌드에 구글 키가 없으면 아무것도 하지 않는다(단추도 눌리지 않는다)
   */
  const start = (withCode: string | undefined) => {
    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) toGoogle(withCode);
    else if (DEV_LOGIN) void standIn(withCode);
  };

  /** 「초대 코드가 있어요」 에서 넣은 코드를 들고 로그인한다 */
  const continueWithCode = () => {
    if (!canSignIn || entered.length !== 6 || enteredBlocked) return;
    setInviting(false);
    start(entered);
  };

  if (unused) return <UnusedInvite onDone={() => router.replace(unused)} />;

  // 구글로 떠나는 중 · 돌아와 코드를 바꾸는 중에는 단추 대신 들어가는 화면. 두 번 누르거나 멈춘 줄 알고 닫지 않게
  if (signing) {
    const step = signing === "exchange" ? "confirm" : signing === "review" ? "review" : "enter";
    return <SigningIn step={step} />;
  }

  return (
    <PlainScreen className="flex min-h-dvh flex-col gap-8">
      {/* 섬과 단추는 남는 높이의 가운데(위아래 auto 여백), 두 문서 링크는 맨 아래 */}
      <div className="mt-auto flex flex-col items-center text-center">
        <KiumIsland
          stage={3}
          level={9}
          plants={16}
          seed="kium-login"
          cheer
          spin="auto"
          height={250}
          label="키움 섬이에요. 운동한 날마다 나무가 하나씩 자라요"
        />
        <h1 className="page-title -mt-1">우리가족 체력키움</h1>
      </div>

      {/*
        구글 키가 없는 개발 빌드에서도 단추는 선다. 누르면 구글 대신 새 계정으로 같은 길을 걷는다.
        개발 로그인이 꺼진 빌드에 구글 키가 없으면 단추는 서 있되 눌리지 않는다
      */}
      <div className="mb-auto space-y-3">
        {withdrawn && (
          <p role="status" className="text-ink-soft text-body text-center font-semibold">
            {WITHDRAWN_NOTICE}
          </p>
        )}
        {/* 초대 링크로 왔다 — 어느 가족의 초대인지 보이고, 로그인하면 그 코드로 참여 화면에 간다 */}
        {claimCode && (
          <p role="status" className="text-ink-soft text-body text-center font-semibold">
            {linkPeek.data ? invitePeekLine(linkPeek.data) : `초대 코드 ${claimCode}`}
            <br />
            로그인하면 가족 참여로 이어져요
          </p>
        )}
        <Button
          size="block"
          variant="outline"
          disabled={!canSignIn}
          onClick={() => start(claimCode)}
        >
          <GoogleMark />
          Google 계정으로 로그인
        </Button>
        {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && DEV_LOGIN && (
          <p className="text-ink-soft text-caption text-center">
            구글 키가 없는 개발 빌드예요. 누르면 새 계정으로 들어가요
          </p>
        )}
        {/* 링크 없이 코드만 받은 사람의 입구. 코드를 넣고 구글 로그인으로 이어진다 */}
        {!claimCode && (
          <Button
            size="block"
            variant="soft"
            disabled={!canSignIn}
            onClick={() => {
              setEntered("");
              setInviting(true);
            }}
          >
            <ArtIcon name="icon/menu-invite" className="size-5" />
            초대 코드가 있어요
          </Button>
        )}

        {/* 심사위원이 구글 계정 없이 둘러보는 길 — 운영 빌드에도 늘 있다. 누르면 세 흐름 가운데 고른다 */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="text-ink-soft text-body min-h-11 px-3 font-semibold underline underline-offset-4"
          >
            심사용 계정으로 둘러보기
          </button>
        </div>

        {DEV_LOGIN && (
          <div className="card space-y-2">
            <p className="text-ink-soft text-caption font-bold">개발용으로 구글 없이 들어가기</p>
            {DEV_ACCOUNTS.map((account) => (
              <Button
                key={account.id}
                size="md"
                variant="outline"
                className="w-full"
                loading={devLogin.isPending}
                onClick={() => enter(account)}
              >
                <span className="min-w-0 flex-1 text-left">{account.label}</span>
              </Button>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="text-signal-deep text-center text-sm font-semibold">
            {error}
          </p>
        )}
      </div>

      <LegalLinks />

      <Sheet open={inviting} onClose={() => setInviting(false)} title="초대 코드 입력">
        <div className="space-y-3 pb-2">
          <input
            value={entered}
            onChange={(e) => setEntered(normalizeCode(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && continueWithCode()}
            placeholder="ABC123"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="초대 코드 여섯 자리"
            className="border-line focus:border-signal placeholder:text-faint board-num field-focus h-16 w-full rounded-xl border bg-transparent text-center text-2xl tracking-[0.35em]"
          />
          {enteredPeek.data && (
            <p className="text-body text-center font-extrabold">
              {invitePeekLine(enteredPeek.data)}
            </p>
          )}
          {enteredBlocked && (
            <p role="alert" className="text-signal-deep text-center text-sm font-semibold">
              {claimErrorMessage(enteredPeek.error)}
            </p>
          )}
          <Button
            size="block"
            disabled={
              !canSignIn || entered.length !== 6 || enteredBlocked || enteredPeek.isFetching
            }
            onClick={continueWithCode}
          >
            구글로 계속하기
          </Button>
        </div>
      </Sheet>

      <Sheet open={picking} onClose={() => setPicking(false)} title="어떻게 둘러볼까요">
        <ul className="space-y-2 pb-2">
          {REVIEW_WAYS.map((way) => (
            <li key={way.kind}>
              <button
                type="button"
                onClick={() => void review(way.kind)}
                className="press bg-sub flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-body block font-extrabold">{way.title}</span>
                  <span className="text-caption text-ink-soft mt-0.5 block">{way.description}</span>
                </span>
                <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </PlainScreen>
  );
}

/**
 * 약관 동의 안내. 가입하는 사람 본인의 동의는 로그인 화면의 이 한 줄로 받는다(이용약관 제4조 ②).
 * 구글 로그인(OAuth) 앱 심사도 로그인 전에 두 문서를 볼 수 있는 링크를 요구한다. 두 문서는 로그인하지 않아도 열린다
 */
function LegalLinks() {
  const link = "text-ink font-bold underline underline-offset-4";
  return (
    <p className="text-ink-soft text-caption px-4 py-2 text-center leading-relaxed">
      로그인하면{" "}
      <Link href={TERMS_HREF} className={link}>
        이용약관
      </Link>
      과{" "}
      <Link href={PRIVACY_HREF} className={link}>
        개인정보 처리방침
      </Link>
      에 동의하는 것으로 봅니다
    </p>
  );
}

/** 가족이 있는 계정이라 들고 온 초대 코드를 쓰지 않았다 — 까닭과 해결법을 한 번 보이고 가던 곳으로 */
function UnusedInvite({ onDone }: { onDone: () => void }) {
  return (
    <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-5 text-center">
      <LevelBuddy stage={3} size={120} />
      <div className="space-y-2" role="status">
        <p className="page-title text-balance break-keep">{UNUSED_INVITE_COPY.title}</p>
        <p className="text-ink-soft text-body">{UNUSED_INVITE_COPY.detail}</p>
      </div>
      <Button size="block" onClick={onDone}>
        확인
      </Button>
    </PlainScreen>
  );
}

const SIGNING_TITLE = {
  enter: "구글 계정으로 들어가는 중",
  confirm: "구글 계정을 확인하는 중",
  review: "심사용 계정으로 들어가는 중",
} as const;

/** 들어가는 화면 — 구글로 떠나기 직전 · 돌아와 계정을 확인하는 동안 · 심사용 계정을 받는 동안 */
function SigningIn({ step }: { step: keyof typeof SIGNING_TITLE }) {
  return (
    <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-5 text-center">
      <LevelBuddy stage={3} size={140} cheer />
      <div className="space-y-1" role="status" aria-live="polite">
        <p className="page-title">{SIGNING_TITLE[step]}</p>
        <p className="text-ink-soft text-body">잠깐이면 돼요</p>
      </div>
      <Loader2 className="text-signal-strong size-7 animate-spin" aria-hidden />
    </PlainScreen>
  );
}

/** 구글의 G. 브랜드 지침(네 색 그대로)을 따르느라 색 토큰을 쓰지 않는다 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
