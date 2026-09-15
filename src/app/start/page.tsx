"use client";

import { useRouter } from "next/navigation";

import { Stage } from "@/components/app-shell/stage";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

/**
 * 부모인가 아이인가.
 *
 * **앱이 여기서 둘로 갈린다.** 계정은 하나인데 쓰는 사람이 둘이라, 이건 계정
 * 속성이 아니라 이 기기의 지금 상태다(`role-store`). 부모 폰을 아이가 잠깐
 * 빌려 쓰는 일이 실제로 일어난다.
 *
 * 고르는 화면이라 설명을 길게 쓰지 않는다. 그림 두 개가 설명이다.
 */
export default function StartPage() {
  const router = useRouter();
  const { familyId, nextStep, isPending } = useSession();
  const { data: family } = useFamilyProfiles(familyId);

  const setMode = useRoleStore((s) => s.setMode);
  const setChild = useRoleStore((s) => s.setChild);

  const children = (family?.profiles ?? []).filter((p) => p.role === "CHILD");
  const hasFamily = Boolean(familyId) && nextStep !== "CREATE_FAMILY";

  const goParent = () => {
    setMode("parent");
    // 가족이 아직 없으면 만드는 것부터
    router.push(hasFamily ? "/parent" : "/start/parent");
  };

  const goKid = () => {
    setMode("kid");
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
        art="anim/wave-1"
        fallbackArt="char/body-child-m"
        title="아이"
        description="오늘 할 운동을 보고 바로 시작해요"
        tone="kid"
        onClick={goKid}
      />

      <RoleCard
        art="char/face-parent-1"
        fallbackArt="char/body-adult-f"
        title="부모"
        description="아이 체력을 보고 칭찬을 보내요"
        tone="parent"
        onClick={goParent}
      />
    </Stage>
  );
}

/**
 * 고르는 칸.
 *
 * 같은 크기 카드 두 장을 나열하지 않는다 — 아이 쪽을 크게 만든다.
 * 이 앱을 실제로 매일 여는 사람은 아이이고, 아이는 작은 것을 잘 못 누른다.
 */
function RoleCard({
  art,
  fallbackArt,
  title,
  description,
  tone,
  onClick,
}: {
  art: string;
  /** 2차 에셋이 오기 전까지 쓸 그림. Illustration 은 없으면 조용히 숨는다 */
  fallbackArt: string;
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
      <Illustration name={art} fallback={fallbackArt} size={kid ? 96 : 68} />
      <span className="min-w-0">
        <span className={kid ? "block text-2xl font-extrabold" : "block text-xl font-extrabold"}>
          {title}
        </span>
        <span className="text-ink-soft mt-1 block text-sm leading-relaxed">{description}</span>
      </span>
    </button>
  );
}
