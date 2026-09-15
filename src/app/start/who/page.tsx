"use client";

import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Avatar } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { avatarFor } from "@/lib/avatar";
import { useRoleStore } from "@/stores/role-store";

/**
 * 형제 중 누구인지.
 *
 * 아이가 한 명이면 이 화면을 거치지 않는다. 고를 게 없는데 고르게 하면
 * 한 번 더 누르는 일만 는다.
 *
 * 누르는 칸을 크게 만든다. 여기를 누르는 손은 아이 손이다.
 */
export default function WhoPage() {
  const router = useRouter();
  const { familyId } = useSession();
  const { data: family, isPending } = useFamilyProfiles(familyId);
  const setChild = useRoleStore((s) => s.setChild);

  const kids = (family?.profiles ?? []).filter((p) => p.role === "CHILD");

  if (isPending) {
    return (
      <>
        <AppBar back title="누구야?" />
        <Stage className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-3xl" />
          ))}
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar back title="" />
      <Stage className="space-y-4">
        <h1 className="text-[1.6rem] leading-tight font-extrabold">누구야?</h1>

        <ul className="space-y-3">
          {kids.map((kid) => (
            <li key={kid.profileId}>
              <button
                type="button"
                onClick={() => {
                  setChild(kid.profileId ?? null);
                  router.replace("/kid");
                }}
                className="press border-line flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left"
              >
                <Avatar parts={avatarFor(kid)} size={64} />
                <span className="text-xl font-extrabold">{kid.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </Stage>
    </>
  );
}
