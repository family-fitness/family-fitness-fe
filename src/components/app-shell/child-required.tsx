"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { RouteLoading } from "@/components/app-shell/route-loading";
import { useFamilyProfiles } from "@/lib/api/queries";
import { mustAddChild, mustSetUpFamily, openWithoutChild } from "@/lib/family";
import { useSession } from "@/lib/session";
import { useHydrated, useIsKidView } from "@/lib/view-role";

/**
 * 아이 없는 가족을 아이 등록 화면으로 보내는 가드 컴포넌트.
 *
 * 우리 서비스는 아이와 함께 쓴다 — 아이 없는 어른은 대상이 아니다. 가족에 아이가 한 명도 없으면
 * 앱 화면에 들이지 않고 `/start/child?why=no-child` 로 보낸다(그 화면이 까닭을 한 줄로 알린다).
 * 설정(로그아웃 포함) · 알림 · 가족 관리는 열어 둔다(`openWithoutChild`).
 * 가족을 받는 동안 · 못 받았을 때는 막지 않는다 — 각 화면이 스켈레톤 로딩과 다시 불러오기 버튼을 보여 준다.
 */
export function ChildRequired({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const kidView = useIsKidView();
  const { profile, familyId, nextStep } = useSession();
  const { data: family } = useFamilyProfiles(familyId);

  // 가족이 없는 계정이 먼저다. 스플래시를 거치지 않고 주소로 들어와도 가족 만들기나 합류 화면으로
  const setup = mustSetUpFamily({ nextStep, pathname });
  const send =
    hydrated &&
    !openWithoutChild(pathname) &&
    mustAddChild({ kidView, me: profile, profiles: family?.profiles ?? undefined });

  useEffect(() => {
    if (setup) router.replace(setup);
    else if (send) router.replace("/start/child?why=no-child");
  }, [setup, send, router]);

  if (setup || send) return <RouteLoading />;
  return <>{children}</>;
}
