"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Stage } from "@/components/app-shell/stage";

import { LevelBuddy } from "@/components/domain/level-buddy";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { ArtIcon } from "@/components/ui/art-icon";

/** 부모인가 아이인가. */
export default function StartPage() {
  const router = useRouter();
  const { profile, familyId, nextStep, isPending, error, refetch } = useSession();
  // 아이가 몇인지 알아야 「아이」 가 갈 곳을 안다 — 오기 전에 누르면 있는 아이를 두고 아이 등록으로 갔다
  const { data: family, isLoading: familyLoading } = useFamilyProfiles(familyId);

  const setMode = useRoleStore((s) => s.setMode);
  const setChild = useRoleStore((s) => s.setChild);

  const children = (family?.profiles ?? []).filter((p) => p.role === "CHILD");
  const hasFamily = Boolean(familyId) && nextStep !== "CREATE_FAMILY";

  /** 자녀 계정에는 부모 모드를 내주지 않는다. */
  const childAccount = profile?.role === "CHILD";

  const goParent = () => {
    setMode("parent");
    // 가족이 아직 없으면 만드는 것부터
    router.push(hasFamily ? "/parent" : "/start/family");
  };

  // 아이 모드는 아이 홈에 들어갈 때 정해진다(아이 구역이 정한다). 아이 등록 · 초대코드로 가는 길에서 미리 정하면
  // 그 길을 그만둔 뒤 다음에 열 때 아이 없는 아이 홈이 떴다
  const goKid = () => {
    // 자녀 계정은 자기 프로필로 고정된다. 형제를 고르게 하지 않는다
    if (childAccount && profile?.profileId) {
      setChild(profile.profileId);
      router.push("/kid");
      return;
    }
    if (!hasFamily) {
      // 아이 계정은 부모가 만들어 둔 프로필에 붙는다. 스스로 가족을 만들 수 없다
      router.push("/claim");
      return;
    }
    if (children.length === 1) {
      setChild(children[0].profileId ?? null);
      router.push("/kid");
      return;
    }
    // 아이가 없으면 등록부터, 여럿이면 고르기
    router.push(children.length === 0 ? "/start/child" : "/start/who");
  };

  // 누구인지 못 받으면 고를 수 없다 — 모르는 채 「부모」 를 누르면 가족 만들기로 갔다
  if (error) {
    return (
      <Stage className="flex min-h-dvh flex-col justify-center">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Stage>
    );
  }

  if (isPending || familyLoading) {
    return (
      <Stage className="flex min-h-dvh flex-col justify-center gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </Stage>
    );
  }

  return (
    <Stage className="flex min-h-dvh flex-col justify-center gap-5 py-8">
      <div>
        <h1 className="text-[1.6rem] leading-tight font-extrabold">누가 쓰고 있나요?</h1>
      </div>

      <RoleCard title="아이" tone="kid" onClick={goKid} art={<LevelBuddy stage={2} size={92} />} />

      {/* 자녀 계정에는 부모 칸을 내지 않는다 */}
      {!childAccount && (
        <RoleCard
          title="부모"
          tone="parent"
          onClick={goParent}
          art={<ArtIcon name="icon/role-parent" className="size-16 shrink-0" />}
        />
      )}
    </Stage>
  );
}

/** 고르는 칸. */
function RoleCard({
  art,
  title,
  tone,
  onClick,
}: {
  art: ReactNode;
  title: string;
  tone: "kid" | "parent";
  onClick: () => void;
}) {
  const kid = tone === "kid";
  return (
    <button
      type="button"
      onClick={onClick}
      /* 아이 칸이 더 크다(주인공). 파랑 테를 두르면 이미 고른 것처럼 보여 테는 없다 */
      className={
        kid
          ? "press card-hero flex items-center gap-4 text-left"
          : "press card flex items-center gap-4 text-left"
      }
    >
      {art}
      <span className={kid ? "min-w-0 text-2xl font-extrabold" : "min-w-0 text-xl font-extrabold"}>
        {title}
      </span>
    </button>
  );
}
