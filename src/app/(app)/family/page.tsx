"use client";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/illustration";
import { LinkRow } from "@/components/domain/link-row";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { avatarFor } from "@/lib/avatar";

/** 가족 허브 — 구성원과 가족 단위 화면들로 가는 길 */
export default function FamilyHubPage() {
  const { familyId, isPending: sessionPending } = useSession();
  const { data: family, isPending } = useFamilyProfiles(familyId);

  return (
    <>
      <PageHeader eyebrow="FAMILY" title={family?.familyName ?? "가족"} />
      <Screen className="space-y-6">
        {sessionPending || isPending ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {(family?.profiles ?? []).map((p) => (
              <li key={p.profileId}>
                <a
                  href={`/p/${p.profileId}`}
                  className="press border-line flex w-20 flex-col items-center gap-1 rounded-xl border p-2"
                >
                  <Avatar parts={avatarFor(p)} size={52} />
                  <span className="truncate text-[0.72rem] font-bold">{p.name}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <ul className="divide-rows">
          <LinkRow
            href="/family/cheer"
            art="item/item-whistle"
            title="응원 보내기"
            description="같이 못 뛰어도 남는 게 있어요"
          />
          <LinkRow
            href="/family/report"
            art="item/item-calendar"
            title="이번 주 기록"
            description="누가 얼마나 움직였는지"
          />
          <LinkRow
            href="/parent/family"
            art="scene/scene-invite"
            title="가족 더하기 · 초대"
            description="프로필을 만들고 초대코드를 보내요"
          />
          <LinkRow href="/settings" art="item/item-clipboard" title="설정" />
        </ul>
      </Screen>
    </>
  );
}
