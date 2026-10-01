"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SessionError } from "@/components/app-shell/session-error";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { Illustration } from "@/components/ui/illustration";
import { NavLink } from "@/components/ui/nav-link";
import { NEW_ACCOUNT_CHOICES } from "@/lib/family";
import { useSession, useSignOut } from "@/lib/session";
import { useAuthStore } from "@/stores/auth-store";

/** 두 길의 그림 — 새 가족은 보호자, 초대는 초대장 */
const ART = { "/start/family": "icon/role-parent", "/claim": "icon/menu-invite" } as const;

/**
 * 가족이 없는 새 계정의 첫 화면 — 새 가족을 만들지, 초대 코드로 참여할지 고른다.
 *
 * 전에는 새 계정이 곧장 가족 만들기로 갔다. 초대받은 사람이 링크가 아니라 앱부터 열면 자기 가족을 먼저 만들었고,
 * 그 뒤로는 어떤 초대 코드도 「이미 다른 가족에 참여한 계정」 이라 막혔다(받은 피드백).
 */
export default function WelcomePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const { nextStep, error, refetch } = useSession();
  const signOut = useSignOut();

  // 로그인이 안 됐으면 로그인부터. persist 가 되살아나기 전에는 토큰이 비어 있어 한 틱 기다린다
  useEffect(() => {
    if (token) return;
    const id = setTimeout(() => {
      if (!useAuthStore.getState().accessToken) router.replace("/login");
    }, 600);
    return () => clearTimeout(id);
  }, [token, router]);

  // 이미 가족이 있으면 고를 것이 없다 — 스플래시가 홈으로 보낸다
  const hasFamily = nextStep === "HOME" || nextStep === "SUPPORT_MODE";
  useEffect(() => {
    if (hasFamily) router.replace("/");
  }, [hasFamily, router]);

  if (error) return <SessionError error={error} onRetry={() => void refetch()} />;

  return (
    <Stage className="flex min-h-dvh flex-col justify-center gap-4 py-8">
      <div className="mb-2 flex flex-col items-center text-center">
        <Illustration name="scene/kiumi-hello" size={112} priority />
        <h1 className="page-title mt-3">어떻게 시작할까요?</h1>
      </div>

      {NEW_ACCOUNT_CHOICES.map((choice) => (
        <NavLink
          key={choice.href}
          href={choice.href}
          className="press card flex items-center gap-4 text-left"
        >
          <ArtIcon name={ART[choice.href]} className="size-14 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold">{choice.title}</span>
            <span className="text-ink-soft text-caption mt-0.5 block">{choice.description}</span>
          </span>
          <ChevronRight aria-hidden className="text-faint size-5 shrink-0" />
        </NavLink>
      ))}

      {/* 다른 구글 계정으로 들어와야 했으면 — 이 화면에서 나갈 길 */}
      <button
        type="button"
        onClick={() => {
          router.replace("/login");
          signOut();
        }}
        className="press text-ink-soft mx-auto mt-2 flex min-h-11 items-center px-4 text-sm font-bold"
      >
        다른 계정으로 들어가기
      </button>
    </Stage>
  );
}
