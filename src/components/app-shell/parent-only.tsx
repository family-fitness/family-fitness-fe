"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { RouteLoading } from "@/components/app-shell/route-loading";
import { useHydrated, useIsKidView } from "@/lib/view-role";

/**
 * 부모만 보는 화면.
 *
 * 설정 화면에서 링크를 감추는 것만으로는 부족하다 — 주소를 바로 치면 들어와진다.
 * 서버는 막아 주지 않는다. 가족 조회는 구성원이면 누구나 되고 그건 서버 입장에서
 * 맞다. 아이에게 무엇을 보여줄지는 화면이 정하는 일이다.
 */
export function ParentOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const kidView = useIsKidView();
  // 역할은 이 기기에만 있다 — 서버와 브라우저의 첫 화면을 같게(비워) 두고, 그다음에 가른다.
  // 먼저 그려 버리면 아이 모드에서 부모 화면이 잠깐 비친다
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && kidView) router.replace("/kid");
  }, [hydrated, kidView, router]);

  // 가르기 전에는 화면이 넘어갈 때와 같은 뼈대 — 빈 바탕이 한 번 번쩍이지 않게. 서버와 브라우저의 첫 화면이 같다
  if (!hydrated || kidView) return <RouteLoading />;
  return <>{children}</>;
}
