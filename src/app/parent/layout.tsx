"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";

/** 부모 구역 문지기. */
export default function ParentAreaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, isPending } = useSession();
  const mode = useRoleStore((s) => s.mode);

  /** 두 가지를 함께 본다. 역할은 이 기기에만 있어 브라우저에서 그리기 시작한 뒤에 본다(서버와 첫 화면을 같게) */
  const hydrated = useHydrated();
  const blocked = profile?.role === "CHILD" || mode === "kid";

  useEffect(() => {
    if (hydrated && !isPending && blocked) router.replace("/kid");
  }, [hydrated, isPending, blocked, router]);

  // 잠깐이라도 비치면 안 된다
  if (!hydrated || blocked) return null;
  return children;
}
