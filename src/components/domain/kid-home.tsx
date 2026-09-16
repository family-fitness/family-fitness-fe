"use client";

import Link from "next/link";

import type { Mission, ProfileSummary } from "@/lib/api/types";
import { avatarFor } from "@/lib/avatar";
import { Avatar, Illustration } from "@/components/ui/illustration";
import { SpriteField } from "@/components/scene/sprite-field";

/** 아이 화면. */
export function KidHome({
  profile,
  missions,
}: {
  profile: ProfileSummary;
  missions: Mission[] | undefined;
}) {
  const mine = (missions ?? []).filter((m) =>
    m.participants?.some((p) => p.profileId === profile.profileId),
  );
  const todo = mine.find((m) =>
    m.participants?.some((p) => p.profileId === profile.profileId && !p.completed),
  );
  const doneCount = mine.filter((m) =>
    m.participants?.some((p) => p.profileId === profile.profileId && p.completed),
  ).length;

  return (
    <div className="relative px-5 pt-2 pb-6">
      {/* 배경에 조각이 천천히 떠다닌다. 아이 화면은 부모 화면보다 놀이처럼 보여도 된다 */}
      <SpriteField
        assets={["deco/deco-sparkle", "deco/deco-cloud-1", "deco/deco-cloud-2"]}
        count={9}
        speed={0.55}
        opacity={0.14}
        scale={[14, 30]}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56"
      />

      {/* 이름을 크게. 아이는 자기 이름을 먼저 찾는다 */}
      <div className="flex items-center gap-3">
        <Avatar parts={avatarFor(profile)} size={72} />
        <p className="text-[1.75rem] leading-tight font-extrabold">
          {profile.name}
          <span className="text-ink-soft text-xl font-bold"> 안녕!</span>
        </p>
      </div>

      {/* 오늘 할 일 하나. 여러 개를 늘어놓지 않는다 */}
      <div className="mt-7">
        {todo ? (
          <Link
            href={`/missions/${todo.missionId}`}
            className="press bg-signal block rounded-3xl p-6 text-white"
          >
            <p className="text-base font-bold opacity-90">오늘 할 일</p>
            <p className="mt-1 text-2xl leading-snug font-extrabold">{todo.title}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-white/20 px-4 py-2 text-lg font-extrabold">
                시작하기
              </span>
              <Illustration name="move/move-stretch-back" size={84} />
            </div>
          </Link>
        ) : (
          <div className="border-line rounded-3xl border-2 border-dashed p-6 text-center">
            <Illustration name="scene/scene-no-mission" size={120} className="mx-auto" />
            <p className="mt-3 text-xl font-extrabold">오늘은 쉬는 날이에요</p>
            <p className="text-ink-soft mt-1 text-sm">새로운 운동이 생기면 여기에 나와요</p>
          </div>
        )}
      </div>

      {/* 해낸 것. 숫자로 세지 않고 도장을 찍는다 */}
      <div className="mt-7">
        <p className="text-lg font-extrabold">해낸 것</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {doneCount === 0 ? (
            <p className="text-ink-soft text-sm">아직 없어요. 하나만 해보면 도장이 찍혀요.</p>
          ) : (
            Array.from({ length: doneCount }).map((_, index) => (
              <span
                key={index}
                className="bg-mark-soft grid size-16 place-items-center rounded-2xl"
              >
                <Illustration name="item/item-medal" size={44} />
              </span>
            ))
          )}
        </div>
      </div>

      {/* 나갈 수 있는 곳은 둘뿐이다. 많으면 길을 잃는다 */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        <KidTile href="/videos" label="운동 영상" asset="item/item-mat" />
        <KidTile href="/family/cheer" label="응원 보내기" asset="deco/deco-star" />
      </div>
    </div>
  );
}

function KidTile({ href, label, asset }: { href: string; label: string; asset: string }) {
  return (
    <Link
      href={href}
      className="press border-line flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2"
    >
      <Illustration name={asset} size={56} />
      <span className="text-base font-extrabold">{label}</span>
    </Link>
  );
}
