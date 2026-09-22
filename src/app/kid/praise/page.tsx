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
import { formatDate, withJosa } from "@/lib/utils";

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
  const newest = cheers[0];

  if (cheers.length === 0) {
    return (
      <>
        <AppBar backHref="/kid" title="칭찬" />
        <Stage wide className="flex flex-col items-center pt-8 text-center">
          <Illustration name="scene/scene-waiting-stamp" size={150} />
          <p className="mt-4 text-xl font-extrabold">아직 칭찬이 없어요</p>
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar backHref="/kid" title="칭찬" />
      <Stage wide className="relative space-y-5">
        <Backdrop name="bg/bg-hill" height={190} />
        {/*
          개수를 크게 세지 않는다. "칭찬 3개" 를 제목으로 걸면 받은 말이
          모아야 할 것이 되고, 못 받은 날이 실패가 된다(도메인 규칙 12).
          가장 최근에 받은 말 하나를 크게 보여 주는 것으로 대신한다.
        */}
        <div className="flex items-center gap-3">
          <KidCharacter motion="cheer" size={84} />
          <p className="text-lead min-w-0 flex-1 leading-snug font-extrabold">
            {withJosa(newest.fromName, "이가")} 이렇게 말했어요
          </p>
        </div>

        {/* 말풍선으로 쌓는다. 표로 늘어놓으면 받은 느낌이 안 난다 */}
        <ul className="space-y-3">
          {cheers.map((cheer) => (
            <li key={cheer.cheerId}>
              <p className="bg-signal-soft text-signal-deep text-lead rounded-2xl rounded-bl-md px-4 py-3.5 leading-relaxed font-bold">
                {cheer.message}
              </p>
              <p className="text-faint text-micro mt-1 ml-1">
                {cheer.fromName} · {formatDate(cheer.createdAt.slice(0, 10))}
              </p>
            </li>
          ))}
        </ul>
      </Stage>
    </>
  );
}
