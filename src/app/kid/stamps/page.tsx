"use client";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter } from "@/components/domain/kid-character";
import { StampMark } from "@/components/domain/stamp-mark";
import { useCheers } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { formatDate } from "@/lib/utils";

/**
 * 받은 도장.
 *
 * 아이가 다시 열어 보는 화면이다. **모은 것이 쌓여 보여야** 다음에도 한다.
 * 그래서 목록이 아니라 판에 찍힌 모양으로 늘어놓는다.
 *
 * 개수를 목표로 만들지 않는다 — "10개 모으면" 같은 말을 붙이면 못 채운 날이
 * 실패가 된다. 그냥 모인 걸 보여준다.
 */
export default function KidStampsPage() {
  const { familyId } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data, isPending } = useCheers(familyId, childProfileId ?? undefined);

  if (isPending) {
    return (
      <>
        <AppBar back title="받은 도장" />
        <Stage wide className="grid grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </Stage>
      </>
    );
  }

  const cheers = data?.cheers ?? [];

  if (cheers.length === 0) {
    return (
      <>
        <AppBar back title="받은 도장" />
        <Stage wide className="flex flex-col items-center pt-8 text-center">
          <Illustration
            name="scene/scene-waiting-stamp"
            fallback="scene/scene-waiting-approval"
            size={150}
          />
          <p className="mt-4 text-xl font-extrabold">아직 도장이 없어요</p>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            오늘 운동을 마치고 알리면 부모님이 찍어 주실 거예요.
          </p>
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar back title="받은 도장" />
      <Stage wide className="space-y-6">
        <div className="flex items-center gap-3">
          <KidCharacter motion="cheer" size={84} />
          <p className="text-[1.4rem] leading-tight font-extrabold">
            도장 {cheers.length}개
            <span className="text-ink-soft block text-sm font-bold">모으는 중이에요</span>
          </p>
        </div>

        {/* 판에 찍힌 모양으로. 목록으로 늘어놓으면 모은 느낌이 안 난다 */}
        <ul className="grid grid-cols-3 gap-3">
          {cheers.map((cheer) => (
            <li
              key={cheer.cheerId}
              className="border-line flex flex-col items-center gap-1 rounded-2xl border p-3"
            >
              <StampMark stamp={cheer.stamp} size={56} />
              <span className="text-faint text-[0.62rem]">
                {formatDate(cheer.createdAt.slice(0, 10))}
              </span>
            </li>
          ))}
        </ul>

        {/* 부모가 적어 준 말. 도장보다 이게 오래 남는다 */}
        <section>
          <h2 className="text-[1.05rem] font-extrabold">받은 말</h2>
          <ul className="divide-rows mt-2">
            {cheers
              .filter((c) => c.message)
              .map((cheer) => (
                <li key={cheer.cheerId} className="flex items-start gap-3 py-3.5">
                  <StampMark stamp={cheer.stamp} size={40} />
                  <span className="min-w-0">
                    <span className="block text-sm leading-relaxed font-bold">{cheer.message}</span>
                    <span className="text-faint mt-0.5 block text-[0.68rem]">
                      {cheer.fromName} · {formatDate(cheer.createdAt.slice(0, 10))}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </Stage>
    </>
  );
}
