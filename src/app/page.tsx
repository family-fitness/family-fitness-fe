"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Illustration } from "@/components/ui/illustration";
import { useMe } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 스플래시.
 *
 * 어디로 보낼지는 **서버가 정한다** — `/me` 의 `nextStep`.
 * 프론트가 "프로필이 0개면 가족 만들기" 같은 판정을 따로 하면 서버와 어긋난다.
 *
 *   CREATE_FAMILY  가족을 아직 안 만듦
 *   CLAIM          초대코드로 들어와야 함
 *   SUPPORT_MODE   초대를 받은 부모 — 참여 방식부터 고른다
 *   HOME           평소
 */
export default function SplashPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const { data, error } = useMe();

  useEffect(() => {
    // persist 가 되살아나기 전에는 토큰이 null 이다. 한 틱 기다린다
    if (token === null) {
      const id = setTimeout(() => {
        if (!useAuthStore.getState().accessToken) router.replace("/onboarding/login");
      }, 350);
      return () => clearTimeout(id);
    }
  }, [token, router]);

  useEffect(() => {
    if (error) router.replace("/onboarding/login");
  }, [error, router]);

  useEffect(() => {
    if (!data?.nextStep) return;
    router.replace(
      {
        CREATE_FAMILY: "/onboarding/family",
        CLAIM: "/claim",
        SUPPORT_MODE: "/settings/support-mode",
        HOME: "/home",
      }[data.nextStep] ?? "/home",
    );
  }, [data, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <Illustration name="move/move-jump-rope" size={140} />
      <p className="page-title text-center">우리가족 체력키움</p>
      <p className="text-ink-soft text-sm">국민체력100 공개데이터로 만든 가족 체력 서비스</p>
    </div>
  );
}
