"use client";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Backdrop } from "@/components/ui/backdrop";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter } from "@/components/domain/kid-character";
import { useCheers } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { formatDate } from "@/lib/utils";

/** 받은 칭찬. */
export default function KidPraisePage() {
  const { familyId } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data, isPending } = useCheers(familyId, childProfileId ?? undefined);

  if (isPending) {
    return (
      <>
        <AppBar backHref="/kid" title="칭찬" />
        <Stage wide className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </Stage>
      </>
    );
  }

  const cheers = (data?.cheers ?? []).filter((c) => c.message);

  if (cheers.length === 0) {
    return (
      <>
        <AppBar backHref="/kid" title="칭찬" />
        <Stage wide className="flex flex-col items-center pt-8 text-center">
          <Illustration name="scene/scene-waiting-stamp" size={150} />
          <p className="mt-4 text-xl font-extrabold">아직 칭찬이 없어요</p>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">부모님의 칭찬 한마디</p>
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar backHref="/kid" title="칭찬" />
      <Stage wide className="relative space-y-5">
        <Backdrop name="bg/bg-hill" height={190} />
        <div className="flex items-center gap-3">
          <KidCharacter motion="cheer" size={84} />
          <p className="text-[1.4rem] leading-tight font-extrabold">
            칭찬 {cheers.length}개
            <span className="text-ink-soft block text-sm font-bold">모으는 중이에요</span>
          </p>
        </div>

        {/* 말풍선으로 쌓는다. 표로 늘어놓으면 받은 느낌이 안 난다 */}
        <ul className="space-y-3">
          {cheers.map((cheer) => (
            <li key={cheer.cheerId}>
              <p className="bg-signal-soft text-signal-deep rounded-2xl rounded-bl-md px-4 py-3.5 text-[0.98rem] leading-relaxed font-bold">
                {cheer.message}
              </p>
              <p className="text-faint mt-1 ml-1 text-[0.68rem]">
                {cheer.fromName} · {formatDate(cheer.createdAt.slice(0, 10))}
              </p>
            </li>
          ))}
        </ul>
      </Stage>
    </>
  );
}
