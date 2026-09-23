"use client";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter } from "@/components/domain/kid-character";
import { useCheers } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { formatDate } from "@/lib/utils";
import { dayOf } from "@/lib/today";

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

  /* 서버가 주는 순서를 믿지 않는다. 받은 말은 최신이 위다 */
  const cheers = (data?.cheers ?? [])
    .filter((c) => c.message)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

  const [newest, ...rest] = cheers;

  return (
    <>
      <AppBar backHref="/kid" title="칭찬" />
      <Stage wide className="space-y-6">
        {/*
          개수를 세지 않는다. "칭찬 3개" 를 제목으로 걸면 받은 말이 모아야 할
          것이 되고, 못 받은 날이 실패가 된다(도메인 규칙 12).
          가장 최근에 받은 한마디를 크게 두는 것으로 대신한다.
        */}
        <div>
          <div className="flex items-end gap-1">
            <KidCharacter motion="cheer" size={92} className="shrink-0" />
            <p className="bg-signal-strong text-lead mb-3 min-w-0 flex-1 rounded-2xl rounded-bl-md px-4 py-3.5 leading-relaxed font-extrabold text-white">
              {newest.message}
            </p>
          </div>
          <p className="text-faint text-micro mt-1 text-right">
            {newest.fromName} · {formatDate(dayOf(newest.createdAt))}
          </p>
        </div>

        {/* 나머지는 말풍선으로 쌓는다. 표로 늘어놓으면 받은 느낌이 안 난다 */}
        {rest.length > 0 && (
          <ul className="space-y-3">
            {rest.map((cheer) => (
              <li key={cheer.cheerId}>
                <p className="bg-signal-soft text-signal-deep text-body rounded-2xl rounded-bl-md px-4 py-3 leading-relaxed font-bold">
                  {cheer.message}
                </p>
                <p className="text-faint text-micro mt-1 ml-1">
                  {cheer.fromName} · {formatDate(dayOf(cheer.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Stage>
    </>
  );
}
