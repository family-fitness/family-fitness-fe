"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ChildRequired } from "@/components/app-shell/child-required";
import { ParentTabBar } from "@/components/app-shell/parent-tab-bar";
import { RouteLoading } from "@/components/app-shell/route-loading";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";

/**
 * 부모 화면 가드 컴포넌트. 아이 화면은 아이 홈으로, 아이 없는 가족은 아이 등록으로(가족 관리는 열어 둔다).
 * 하단 탭도 여기에 둔다. 아이 화면에는 탭이 없다. 탭의 첫 화면이 아니면 탭이 스스로 숨는다(`ParentTabBar`)
 */
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

  // 잠깐이라도 비치면 안 된다 — 그동안은 화면이 넘어갈 때와 같은 뼈대
  if (!hydrated || blocked) return <RouteLoading />;
  return (
    <>
      <ChildRequired>{children}</ChildRequired>
      <ParentTabBar />
    </>
  );
}
