"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { ProfileAvatar } from "@/components/domain/profile-avatar";

/** 형제 중 누구인지. */
export default function WhoPage() {
  const router = useRouter();
  const { familyId, isPending: sessionPending } = useSession();
  // 꺼진 조회의 isPending 은 영영 true 다 — 가족이 없으면 뼈대만 남지 않게 isLoading 으로
  const { data: family, isLoading } = useFamilyProfiles(familyId);
  const setChild = useRoleStore((s) => s.setChild);

  const kids = (family?.profiles ?? []).filter((p) => p.role === "CHILD");

  if (sessionPending || isLoading) {
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
      <AppBar back />
      <Stage className="space-y-4">
        <h1 className="text-[1.6rem] leading-tight font-extrabold">누구야?</h1>

        {kids.length === 0 && (
          <EmptyState
            scene="no-record"
            title="아직 등록된 아이가 없어요"
            action={
              <Link href="/start/child" className="chip press chip-on">
                아이 등록하기
              </Link>
            }
          />
        )}

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
                <ProfileAvatar profileId={kid.profileId} name={kid.name} size="lg" />
                <span className="text-xl font-extrabold">{kid.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </Stage>
    </>
  );
}
