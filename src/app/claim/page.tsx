"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { ApiError } from "@/lib/api/client";
import { useClaimProfile } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 초대 수락.
 *
 * 부모가 만들어 둔 **프로필에 내 계정을 붙이는** 일이다. 새 프로필이 생기는 게
 * 아니라서, 그동안 쌓인 측정과 미션이 그대로 따라온다.
 *
 * 다음에 갈 곳은 서버가 정한다 — 부모면 참여 방식부터(SUPPORT_MODE), 자녀면 홈.
 *
 * 로그인 전에 링크를 열 수도 있다. 그때는 코드를 들고 로그인 화면으로 보낸다.
 */
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

  const [code, setCode] = useState(() => (params.get("code") ?? "").toUpperCase());
  const [error, setError] = useState<string | null>(null);

  // 로그인부터 해야 프로필을 붙일 수 있다. 코드는 들고 간다
  useEffect(() => {
    if (token) return;
    const id = setTimeout(() => {
      if (useAuthStore.getState().accessToken) return;
      const query = code ? `?claimCode=${encodeURIComponent(code)}` : "";
      router.replace(`/onboarding/login${query}`);
    }, 350);
    return () => clearTimeout(id);
  }, [token, code, router]);

  const submit = async () => {
    setError(null);
    try {
      const res = await claim.mutateAsync(code.trim().toUpperCase());
      router.replace(res.nextStep === "SUPPORT_MODE" ? "/settings/support-mode" : "/home");
    } catch (e) {
      setError(claimMessage(e));
    }
  };

  return (
    <PlainScreen className="flex min-h-dvh flex-col justify-center gap-7">
      <div className="flex flex-col items-center text-center">
        <Illustration name="scene/scene-invite" size={140} />
        <h1 className="page-title mt-3">초대코드를 넣어 주세요</h1>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">
          가족이 만들어 둔 프로필에 내 계정을 붙여요. 그동안 쌓인 기록이 그대로 따라와요.
        </p>
      </div>

      <div className="space-y-3">
        <input
          value={code}
          onChange={(e) => {
            // 0/O · 1/I 를 뺀 대문자와 숫자 여섯 자리다
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6),
            );
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && code.length === 6 && submit()}
          placeholder="ABC123"
          inputMode="text"
          autoCapitalize="characters"
          aria-label="초대코드 여섯 자리"
          className="border-line focus:border-signal placeholder:text-faint board-num h-16 w-full rounded-xl border bg-transparent text-center text-2xl tracking-[0.35em] focus:outline-none"
        />

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}

        <Button
          size="block"
          disabled={code.length !== 6}
          loading={claim.isPending}
          onClick={submit}
        >
          가족으로 들어가기
        </Button>
      </div>

      <p className="text-faint text-center text-[0.7rem] leading-relaxed">
        코드는 만든 지 7일 동안 쓸 수 있어요. 지났다면 가족에게 새로 받아 주세요.
      </p>
    </PlainScreen>
  );
}

function claimMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "들어가지 못했어요. 잠시 후 다시 시도해 주세요.";
  switch (error.code) {
    case "CODE_NOT_FOUND":
      return "없는 코드예요. 다시 확인해 주세요.";
    case "CODE_EXPIRED":
      return "기한이 지난 코드예요. 가족에게 새 코드를 받아 주세요.";
    case "ALREADY_CLAIMED":
      return "다른 계정이 먼저 연결했어요. 가족에게 새 코드를 받아 주세요.";
    case "ALREADY_MEMBER":
      return "이미 이 가족의 구성원이에요.";
    default:
      return error.userMessage;
  }
}
