"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Illustration } from "@/components/ui/illustration";
import { useMe } from "@/lib/api/queries";
import { useAuthStore } from "@/stores/auth-store";
import { useRoleStore } from "@/stores/role-store";

/** 스플래시. */
export default function SplashPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const mode = useRoleStore((s) => s.mode);
  const { data, error } = useMe();

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
    if (error) router.replace("/login");
  }, [error, router]);

  useEffect(() => {
    if (!data?.nextStep) return;

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

    // 역할을 고른 적이 있으면 바로 그 홈으로. 없으면 고르는 화면으로
    router.replace(mode === "kid" ? "/kid" : mode === "parent" ? "/parent" : "/start");
  }, [data, mode, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <Illustration name="anim/pose-cheer" size={140} priority />
      <p className="page-title text-center">우리가족 체력키움</p>
      <p className="text-ink-soft text-sm">국민체력100 공개데이터로 만든 가족 체력 서비스</p>
    </div>
  );
}
