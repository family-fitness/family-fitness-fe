"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/lib/errors";
import { useClaimProfile, useInvitePeek } from "@/lib/api/queries";
import { useSignOut } from "@/lib/session";
import { useAuthStore } from "@/stores/auth-store";
import { Initial } from "@/components/ui/initial";
import { ArtIcon } from "@/components/ui/art-icon";

/** 코드가 틀렸다는 뜻인 것만 — 이 코드로는 들어갈 수 없다. 그 밖의 실패는 넣어 보게 둔다 */
const BAD_CODE = new Set(["CODE_NOT_FOUND", "CODE_EXPIRED", "ALREADY_CLAIMED"]);

/** 대문자와 숫자 여섯 자리. 링크로 온 코드도 같은 손질을 거친다 */
const normalizeCode = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

/** 초대 수락. */
export default function ClaimPage() {
  return (
    <Suspense fallback={null}>
      <ClaimContent />
    </Suspense>
  );
}

function ClaimContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useAuthStore((s) => s.accessToken);
  const claim = useClaimProfile();
  const signOut = useSignOut();

  const [code, setCode] = useState(() => normalizeCode(params.get("code") ?? ""));
  const [error, setError] = useState<string | null>(null);
  /*
    코드가 어느 **자리**인지 넣기 전에 본다.

    코드는 가족 전체가 아니라 자리 하나에 발급된다. 그런데 화면이 그걸 말하지
    않아서, 받는 사람은 코드를 넣고 나서야 자기가 누가 됐는지 알았다.
    「서준이네 · 아빠 자리」 를 먼저 보여 주면 역할을 고를 수 없다는 게 사실이 된다.
  */
  // 로그인 전에는 묻지 않는다 — 토큰 없이 물으면 「없는 코드예요」 가 번쩍 뜨고 로그인으로 간다
  const peek = useInvitePeek(token ? code : "");
  const seat = peek.data;
  /*
    미리 보기가 「틀린 코드」 라고 할 때만 막는다. 미리 보기가 없는 서버(▲ 요청)이거나 망이 흔들렸으면
    넣어 보게 둔다 — 진짜 답은 `/profiles/claim` 이 준다. 전에는 미리 보기가 안 되면 단추가 영영 잠겼다
  */
  const badCode =
    peek.error instanceof ApiError && BAD_CODE.has(peek.error.code) ? peek.error : null;
  const canSubmit = code.length === 6 && !badCode && !peek.isFetching && !claim.isPending;

  // 로그인부터 해야 프로필을 붙일 수 있다. 코드는 들고 간다
  useEffect(() => {
    if (token) return;
    const id = setTimeout(() => {
      if (useAuthStore.getState().accessToken) return;
      const query = code ? `?claimCode=${encodeURIComponent(code)}` : "";
      router.replace(`/login${query}`);
    }, 350);
    return () => clearTimeout(id);
  }, [token, code, router]);

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      const res = await claim.mutateAsync(code);
      // 가입 도중이라는 걸 다음 화면이 알아야 한다. 고르고 나서 멈추면 안 된다
      router.replace(
        res.nextStep === "SUPPORT_MODE" ? "/settings/support-mode?from=claim" : "/start",
      );
    } catch (e) {
      setError(claimMessage(e));
    }
  };

  return (
    <PlainScreen className="flex min-h-dvh flex-col justify-center gap-7">
      <div className="flex flex-col items-center text-center">
        <ArtIcon name="icon/menu-invite" className="size-16" />
        <h1 className="page-title mt-3">초대코드를 넣어 주세요</h1>
      </div>

      <div className="space-y-3">
        <input
          value={code}
          onChange={(e) => {
            setCode(normalizeCode(e.target.value));
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="ABC123"
          inputMode="text"
          autoCapitalize="characters"
          aria-label="초대코드 여섯 자리"
          className="border-line focus:border-signal placeholder:text-faint board-num field-focus h-16 w-full rounded-xl border bg-transparent text-center text-2xl tracking-[0.35em]"
        />

        {/* 어느 자리인지. 코드가 맞아야 뜬다 — 둥근 면에 담지 않고 한 줄로 */}
        {seat && (
          <div className="flex items-center gap-3 px-1 py-2">
            <Initial
              name={seat.profileName}
              tone={seat.role === "CHILD" ? "signal" : "mark"}
              size="lg"
            />
            <span className="min-w-0 flex-1">
              <span className="text-body block font-extrabold">
                {seat.familyName} · {seat.profileName} 자리
              </span>
              <span className="text-ink-soft text-caption mt-0.5 block">
                {seat.invitedByName ? `${seat.invitedByName}님이 보냈어요` : "초대를 받았어요"}
              </span>
            </span>
          </div>
        )}

        {(error ?? badCode) && (
          <p role="alert" className="text-signal-deep text-center text-sm font-semibold">
            {error ?? claimMessage(badCode)}
          </p>
        )}

        <Button size="block" disabled={!canSubmit} loading={claim.isPending} onClick={submit}>
          {seat ? `${seat.profileName} 자리로 들어가기` : "가족으로 들어가기"}
        </Button>

        {/* 다른 계정으로 들어왔거나 코드가 없으면 — 이 화면에서 나갈 길 */}
        <button
          type="button"
          onClick={() => {
            router.replace("/login");
            signOut();
          }}
          className="press text-ink-soft mx-auto flex min-h-11 items-center px-4 text-sm font-bold"
        >
          다른 계정으로 들어가기
        </button>
      </div>
    </PlainScreen>
  );
}

const claimMessage = (error: unknown) =>
  errorMessage(
    error,
    {
      CODE_NOT_FOUND: "없는 코드예요. 다시 확인해 주세요.",
      CODE_EXPIRED: "기한이 지난 코드예요.",
      ALREADY_CLAIMED: "다른 계정이 먼저 연결한 코드예요.",
      ALREADY_MEMBER: "이미 이 가족의 구성원이에요.",
    },
    "들어가지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
