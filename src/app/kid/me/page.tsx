"use client";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Backdrop } from "@/components/ui/backdrop";
import { Avatar, Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { PART_LABEL, PICKABLE, avatarFor } from "@/lib/avatar";
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
 *
 * 탭으로 나누지 않고 **세 줄을 한 화면에** 편다. 고를 것이 열한 개뿐이라
 * 탭을 두면 한 번에 네 개만 보이고 나머지 화면이 텅 빈다 — 그리고 탭은
 * 아이에게 "여기 말고 저기에도 뭔가 있다" 를 먼저 배우게 한다.
 */
const SECTIONS = [
  { key: "hair", label: "머리" },
  { key: "face", label: "표정" },
  { key: "body", label: "모습" },
  /*
    옷과 소품은 아직 넣지 않는다.

    `top-*` 은 쇼핑몰 사진처럼 옷만 따로 그린 평면 그림이고 `body-*` 는 이미
    옷을 입은 몸이라, 겹치면 옷 위에 옷이 얹힌다. 소품은 몸의 어디에 얹히는지가
    없어서 머리띠가 발밑에 붙는다. 둘 다 다시 뽑기로 했다 —
    ASSET_PROMPTS_DECOR.md 7절.
  */
] as const;

export default function DressUpPage() {
  const { familyId, isPending } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: family, isLoading } = useFamilyProfiles(familyId);

  const chosen = useAvatarStore((s) => (childProfileId ? s.byProfile[childProfileId] : undefined));
  const put = useAvatarStore((s) => s.put);

  if (isPending || isLoading) return <DressUpSkeleton />;

  const me = family?.profiles?.find((p) => p.profileId === childProfileId);
  const parts = avatarFor(me ?? {}, chosen);

  return (
    <>
      <AppBar backHref="/kid" title="내 캐릭터" />
      <Stage wide className="relative space-y-6">
        <Backdrop name="bg/bg-sky" />

        {/* 지금 모습. 고르는 즉시 여기서 바뀐다 */}
        <div className="flex flex-col items-center pt-2">
          <Avatar parts={parts} size={200} />
          <p className="mt-2 text-lg font-extrabold">{me?.name ?? "나"}</p>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.key}>
            <div className="section-head">
              <h2>{section.label}</h2>
            </div>
            <ul className="mt-2 grid grid-cols-4 gap-2.5">
              {PICKABLE[section.key].map((name) => (
                <li key={name}>
                  <PartButton
                    name={name}
                    on={parts[section.key] === name}
                    onPick={() => childProfileId && put(childProfileId, section.key, name)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Stage>
    </>
  );
}

function PartButton({ name, on, onPick }: { name: string; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={PART_LABEL[name] ?? name}
      onClick={onPick}
      className={cn(
        "press grid aspect-square w-full place-items-center rounded-2xl border-2",
        on ? "border-signal bg-signal-soft" : "border-line",
      )}
    >
      <Illustration name={`char/${name}`} size={52} />
    </button>
  );
}

function DressUpSkeleton() {
  return (
    <>
      <AppBar backHref="/kid" title="내 캐릭터" />
      <Stage wide className="space-y-6">
        <div className="flex justify-center pt-2">
          <Skeleton className="size-50 rounded-3xl" />
        </div>
        {[0, 1].map((row) => (
          <div key={row} className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <div className="grid grid-cols-4 gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </Stage>
    </>
  );
}
