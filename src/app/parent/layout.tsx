"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

/** 부모 구역 문지기. */
export default function ParentAreaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { profile, isPending } = useSession();
  const mode = useRoleStore((s) => s.mode);

  /** 두 가지를 함께 본다. */
  const blocked = profile?.role === "CHILD" || mode === "kid";

  useEffect(() => {
    if (!isPending && blocked) router.replace("/kid");
  }, [isPending, blocked, router]);

  // 잠깐이라도 비치면 안 된다
  if (blocked) return null;
  return (
    <>
      <div className="has-dock">{children}</div>
    </>
  );
}
