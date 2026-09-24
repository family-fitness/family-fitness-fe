"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { useClaimProfile, useInvitePeek } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";
import { Initial } from "@/components/ui/initial";
import { ArtIcon } from "@/components/ui/art-icon";

/** 0/O · 1/I 를 뺀 대문자와 숫자 여섯 자리. 링크로 온 코드도 같은 손질을 거친다 */
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

  const [code, setCode] = useState(() => normalizeCode(params.get("code") ?? ""));
  const [error, setError] = useState<string | null>(null);
  /*
    코드가 어느 **자리**인지 넣기 전에 본다.

    코드는 가족 전체가 아니라 자리 하나에 발급된다. 그런데 화면이 그걸 말하지
    않아서, 받는 사람은 코드를 넣고 나서야 자기가 누가 됐는지 알았다.
    「서준이네 · 아빠 자리」 를 먼저 보여 주면 역할을 고를 수 없다는 게 사실이 된다.
  */
  const peek = useInvitePeek(code);
  const seat = peek.data;

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
    setError(null);
    try {
      const res = await claim.mutateAsync(code.trim().toUpperCase());
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
        <span
          aria-hidden
          className="bg-signal-soft text-signal-strong grid size-20 place-items-center rounded-full"
        >
          <ArtIcon name="icon/menu-invite" className="size-11" />
        </span>
        <h1 className="page-title mt-3">초대코드를 넣어 주세요</h1>
      </div>

      <div className="space-y-3">
        <input
          value={code}
          onChange={(e) => {
            // 0/O · 1/I 를 뺀 대문자와 숫자 여섯 자리다
            setCode(normalizeCode(e.target.value));
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && code.length === 6 && submit()}
          placeholder="ABC123"
          inputMode="text"
          autoCapitalize="characters"
          aria-label="초대코드 여섯 자리"
          className="border-line focus:border-signal placeholder:text-faint board-num field-focus h-16 w-full rounded-xl border bg-transparent text-center text-2xl tracking-[0.35em]"
        />

        {/* 어느 자리인지. 코드가 맞아야 뜬다 */}
        {seat && (
          <div className="border-signal bg-signal-soft flex items-center gap-3 rounded-2xl border p-4">
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

        {peek.isError && code.length === 6 && !error && (
          <p role="alert" className="text-ink-soft text-center text-sm font-bold">
            없는 코드예요. 다시 확인해 주세요.
          </p>
        )}

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
          disabled={code.length !== 6 || !seat}
          loading={claim.isPending}
          onClick={submit}
        >
          {seat ? `${seat.profileName} 자리로 들어가기` : "가족으로 들어가기"}
        </Button>
      </div>

      <p className="text-faint text-caption text-center">코드는 7일 동안 씁니다</p>
    </PlainScreen>
  );
}

const claimMessage = (error: unknown) =>
  errorMessage(
    error,
    {
      CODE_NOT_FOUND: "없는 코드예요. 다시 확인해 주세요.",
      CODE_EXPIRED: "기한이 지난 코드예요. 가족에게 새 코드를 받아 주세요.",
      ALREADY_CLAIMED: "다른 계정이 먼저 연결했어요. 가족에게 새 코드를 받아 주세요.",
      ALREADY_MEMBER: "이미 이 가족의 구성원이에요.",
    },
    "들어가지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
