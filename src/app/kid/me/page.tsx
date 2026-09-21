"use client";

import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Backdrop } from "@/components/ui/backdrop";
import { Avatar, Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { PICKABLE, avatarFor } from "@/lib/avatar";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useAvatarStore } from "@/stores/avatar-store";
import { useRoleStore } from "@/stores/role-store";
import { cn } from "@/lib/utils";

/**
 * 내 캐릭터 꾸미기.
 *
 * 아이가 앱에서 할 수 있는 일이 운동 네 가지뿐이었다. 운동을 안 하는 날에도
 * 열어 볼 이유가 하나는 있어야 앱이 남는다.
 *
 * **목표를 걸지 않는다.** 몇 번 운동하면 열리는 잠긴 칸을 만들지 않는다 —
 * 못 채운 날이 실패가 되기 때문이다. 처음부터 전부 고를 수 있다.
 */
const TABS = [
  { key: "hair", label: "머리" },
  { key: "face", label: "표정" },
  { key: "top", label: "옷" },
  /*
    소품은 아직 넣지 않는다. 지금 있는 부품에는 "몸의 어디에 얹히는지" 가 없어서
    머리띠가 발밑에 붙는다. 기준 위치를 정해 다시 뽑기로 했다 —
    ASSET_PROMPTS_DECOR.md 7절.
  */
] as const;

type PartKey = (typeof TABS)[number]["key"];

export default function DressUpPage() {
  const { familyId, isPending } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: family, isLoading } = useFamilyProfiles(familyId);

  const chosen = useAvatarStore((s) => (childProfileId ? s.byProfile[childProfileId] : undefined));
  const put = useAvatarStore((s) => s.put);

  const [tab, setTab] = useState<PartKey>("hair");

  if (isPending || isLoading) return <DressUpSkeleton />;

  const me = family?.profiles?.find((p) => p.profileId === childProfileId);
  const parts = avatarFor(me ?? {}, chosen);
  const options = PICKABLE[tab];

  return (
    <>
      <AppBar backHref="/kid" title="내 캐릭터" />
      <Stage wide className="relative space-y-5">
        <Backdrop name="bg/bg-sky" height={200} />

        {/* 지금 모습. 고르는 즉시 여기서 바뀐다 */}
        <div className="flex flex-col items-center pt-2">
          <Avatar parts={parts} size={200} />
          <p className="mt-2 text-lg font-extrabold">{me?.name ?? "나"}</p>
        </div>

        <div className="flex gap-2" role="tablist" aria-label="무엇을 바꿀까요">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("chip press flex-1", tab === t.key && "chip-on")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-4 gap-2.5">
          {options.map((name) => {
            const on = (chosen?.[tab] ?? parts[tab as keyof typeof parts]) === name;
            return (
              <li key={name}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={name}
                  onClick={() => childProfileId && put(childProfileId, tab, name)}
                  className={cn(
                    "press grid aspect-square w-full place-items-center rounded-2xl border-2",
                    on ? "border-signal bg-signal-soft" : "border-line",
                  )}
                >
                  <Illustration name={`char/${name}`} size={52} />
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-faint text-caption text-center leading-relaxed">
          언제든 바꿀 수 있어요. 고른 모습은 이 기기에 남아요.
        </p>
      </Stage>
    </>
  );
}

function DressUpSkeleton() {
  return (
    <>
      <AppBar backHref="/kid" title="내 캐릭터" />
      <Stage wide className="space-y-5">
        <div className="flex justify-center pt-2">
          <Skeleton className="size-50 rounded-3xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-2.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      </Stage>
    </>
  );
}
