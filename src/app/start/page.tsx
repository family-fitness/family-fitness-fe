"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Stage } from "@/components/app-shell/stage";
import { Avatar } from "@/components/ui/illustration";
import { KidCharacter } from "@/components/domain/kid-character";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

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
    router.push(hasFamily ? "/parent" : "/start/parent");
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
        art={<KidCharacter motion="wave" size={96} />}
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
          /* 어른 아바타를 조립해 쓴다. 1차 에셋의 move/* 는 다 아이 체형이라
             그대로 쓰면 「부모」 칸에 아이가 앉아 있다 */
          art={<Avatar parts={PARENT_AVATAR} size={92} />}
        />
      )}
    </Stage>
  );
}

/**
 * 부모 칸에 세울 어른.
 *
 * `hair-bob` 은 아이 머리라 어른 몸에 얹으면 큰 아이처럼 보였다. 옷(`top`)은
 * 층에서 뺐다 — `body-*` 가 이미 옷을 입고 있어 겹치면 옷 위에 옷이 된다.
 */
const PARENT_AVATAR = {
  // Avatar 가 "char/" 를 스스로 붙인다. 여기서 또 붙이면 char/char/… 이 되어 사라진다
  body: "body-adult-f",
  hair: "hair-mom-long",
  face: "face-parent-1",
};

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
          ? "press border-signal bg-signal-soft flex items-center gap-4 rounded-3xl border-2 p-6 text-left"
          : "press border-line flex items-center gap-4 rounded-3xl border p-5 text-left"
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
