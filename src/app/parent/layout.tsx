"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

/**
 * 부모 구역 문지기.
 *
 * 부모 화면은 백분위 · 약한 항목처럼 **아이에게 보여주지 않기로 한 것**을 그대로
 * 띄운다. 역할 고르기에서 버튼을 숨기는 것만으로는 부족하다 — 주소를 바로 치면
 * 들어와진다.
 *
 * 서버가 막아 주지 않는다는 점이 중요하다. 가족 조회는 구성원이면 누구나 되고,
 * 그건 서버 입장에서 맞다. 아이에게 무엇을 보여줄지는 화면이 정하는 일이다.
 */
export default function ParentAreaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, isPending } = useSession();
  const mode = useRoleStore((s) => s.mode);

  /*
    두 가지를 함께 본다.
      계정이 자녀면 부모 화면은 아예 없다
      부모 계정이어도 **지금 아이 모드**면 부모 화면을 열지 않는다 —
      부모 폰을 아이가 빌려 쓰는 동안 주소로 돌아 들어오는 길을 막는다
  */
  const blocked = profile?.role === "CHILD" || mode === "kid";

  useEffect(() => {
    if (!isPending && blocked) router.replace("/kid");
  }, [isPending, blocked, router]);

  // 잠깐이라도 비치면 안 된다
  if (blocked) return null;
  return <>{children}</>;
}
