"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Stage } from "@/components/app-shell/stage";

import { LevelBuddy } from "@/components/domain/level-buddy";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { ArtIcon } from "@/components/ui/art-icon";

/** 부모인가 아이인가. */
export default function StartPage() {
  const router = useRouter();
  const { profile, familyId, nextStep, isPending } = useSession();
  const { data: family } = useFamilyProfiles(familyId);

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

  const goKid = () => {
    setMode("kid");
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

  if (isPending) {
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
        <p className="text-ink-soft mt-1.5 text-sm">언제든 바꿀 수 있어요.</p>
      </div>

      <RoleCard
        title="아이"
        description="오늘 할 운동 바로 시작하기"
        tone="kid"
        onClick={goKid}
        art={<LevelBuddy stage={2} size={92} />}
      />

      {childAccount ? (
        <p className="text-faint text-center text-xs leading-relaxed">
          이 계정은 아이 계정이에요. 부모 화면은 보호자 계정에서 볼 수 있어요.
        </p>
      ) : (
        <RoleCard
          title="부모"
          description="아이 체력 보고 칭찬 보내기"
          tone="parent"
          onClick={goParent}
          art={
            <span
              aria-hidden
              className="bg-mark-soft text-ink grid size-20 shrink-0 place-items-center rounded-full"
            >
              <ArtIcon name="icon/role-parent" className="size-11" />
            </span>
          }
        />
      )}
    </Stage>
  );
}

/** 고르는 칸. */
function RoleCard({
  art,
  title,
  description,
  tone,
  onClick,
}: {
  art: ReactNode;
  title: string;
  description: string;
  tone: "kid" | "parent";
  onClick: () => void;
}) {
  const kid = tone === "kid";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        kid
          ? "press card-hero ring-signal flex items-center gap-4 text-left ring-2"
          : "press card flex items-center gap-4 text-left"
      }
    >
      {art}
      <span className="min-w-0">
        <span className={kid ? "block text-2xl font-extrabold" : "block text-xl font-extrabold"}>
          {title}
        </span>
        <span className="text-ink-soft mt-1 block text-sm leading-relaxed">{description}</span>
      </span>
    </button>
  );
}
