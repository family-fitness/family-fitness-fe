"use client";

import { Play, Settings } from "lucide-react";
import Image from "next/image";

import { NavLink } from "@/components/ui/nav-link";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { SectionTitle, Stage } from "@/components/app-shell/stage";
import { ErrorState } from "@/components/ui/error-state";
import { Backdrop } from "@/components/ui/backdrop";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeRow } from "@/components/domain/badge-row";
import { InviteParent } from "@/components/domain/invite-parent";
import { KidCharacter } from "@/components/domain/kid-character";
import { Avatar } from "@/components/ui/illustration";
import { avatarFor } from "@/lib/avatar";
import { useAvatarStore } from "@/stores/avatar-store";
import { PeerCloud } from "@/components/domain/peer-cloud";
import { WeekDots } from "@/components/domain/week-dots";
import {
  useCheers,
  useFamilyProfiles,
  useFitnessMap,
  useMissions,
  useVideos,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { earnedBadges } from "@/lib/badges";
import { isVideoDone } from "@/lib/mission";
import { today } from "@/lib/today";
import { labelBadges, pickTodayVideo, videoArt, whyThisVideo } from "@/lib/video-label";
import { useRoleStore } from "@/stores/role-store";

/** 아이 홈. */
export default function KidHomePage() {
  const router = useRouter();
  const { familyId, isPending, error: sessionError } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);

  const {
    data: map,
    isPending: mapPending,
    error: mapError,
    refetch: refetchMap,
    isRefetching,
  } = useFitnessMap(familyId);
  const { data: family } = useFamilyProfiles(familyId);
  const { data: missions } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });
  /** 가족의 칭찬·알림을 한 번에 받아 두 갈래로 쓴다. */
  const { data: cheerLog } = useCheers(familyId);
  const chosenLook = useAvatarStore((s) =>
    childProfileId ? s.byProfile[childProfileId] : undefined,
  );

  const me = map?.members?.find((m) => m.profileId === childProfileId);
  const profile = family?.profiles?.find((p) => p.profileId === childProfileId);

  // 미션이 없어도 할 게 있어야 한다. 연령대에 맞는 영상을 하나 권한다
  const { data: videos } = useVideos({ list: "ALL", ageGroup: profile?.ageGroup });
  // 몇 개를 해냈는지. 서버가 아는 값이라 기기를 바꿔도 따라온다
  const { data: watched } = useVideos({ list: "RECENT", profileId: childProfileId ?? undefined });

  // /me 가 실패하면 가족 지도는 시작도 못 한다. 실패를 기다림보다 먼저 본다
  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar title="오늘" />
        <Stage wide>
          <ErrorState error={failure} onRetry={() => void refetchMap()} retrying={isRefetching} />
        </Stage>
      </>
    );
  }

  if (isPending || mapPending) return <KidHomeSkeleton />;

  if (!me) {
    return (
      <>
        <AppBar title="안녕!" />
        <Stage wide className="flex flex-col items-center pt-10 text-center">
          <Illustration name="scene/scene-pick-role" fallback="scene/scene-invite" size={150} />
          <p className="mt-4 text-xl font-extrabold">누구인지 골라 주세요</p>
          <button
            type="button"
            onClick={() => router.push("/start")}
            className="press bg-signal mt-5 rounded-2xl px-6 py-4 text-lg font-extrabold text-white"
          >
            고르러 가기
          </button>
        </Stage>
      </>
    );
  }

  const score = me.latest?.overallPercentile ?? null;
  const todo = (missions?.missions ?? []).find((m) =>
    m.participants?.some((p) => p.profileId === childProfileId && !p.completed),
  );
  /* 아무거나 첫 번째를 권하지 않는다. 약한 요인과 집에서 할 수 있는지를 본다 */
  const suggestion = pickTodayVideo(videos?.videos ?? [], {
    weakestFactor: me?.latest?.weakest?.factor,
    watched: watched?.videos,
  });
  const why = suggestion ? whyThisVideo(suggestion, me?.latest?.weakest?.factor) : null;
  const doneCount = (watched?.videos ?? []).filter((v) => isVideoDone(v.maxProgress)).length;
  const allCheers = cheerLog?.cheers ?? [];
  /*
    오늘 몫을 끝냈나.

    전에는 다 하고 돌아와도 곧바로 다음 영상을 권했다. 아이 눈에는 해도 해도
    끝이 없는 화면이고, 어른이 보기에도 재촉이다. 오늘 몫을 끝냈으면
    **해냈다는 화면**을 먼저 보여 주고, 더 하고 싶을 때만 고르러 가게 한다.

    **남은 미션이 있으면 축하하지 않는다.** 오늘 하나 알렸어도 아직 할 게
    남았는데 "다 했어요" 라고 쓰면 화면이 거짓말을 한다.
  */
  const toldToday = allCheers.some(
    (c) => c.fromProfileId === childProfileId && c.createdAt.slice(0, 10) === today(),
  );
  const finishedToday = toldToday && !todo;
  const praises = allCheers.filter((c) => c.toProfileId === childProfileId && c.message);
  const badges = earnedBadges({
    watched: watched?.videos,
    missions: missions?.missions,
    cheers: allCheers,
    me,
    profileId: childProfileId ?? undefined,
  });

  return (
    <>
      <AppBar
        right={
          <NavLink
            href="/settings"
            aria-label="설정"
            className="press text-faint grid size-10 place-items-center rounded-full"
          >
            <Settings className="size-5" />
          </NavLink>
        }
      />

      <Stage wide className="relative space-y-7">
        {/* 조각을 흩뿌리는 대신 하늘 한 장을 깐다. 없으면 조용히 사라진다 */}
        <Backdrop name="bg/bg-sky" />
        {/* 이름을 크게. 아이는 자기 이름을 먼저 찾는다.
            막대에 또 적지 않는다 — 한 화면에 같은 이름이 두 번 뜬다 */}
        <div className="flex items-center gap-2">
          {/*
            가족 프로필을 먼저 쓴다. 체력 지도의 구성원에는 성별이 없어서
            그것만 보면 서준이 절반의 확률로 양갈래 머리가 된다.
          */}
          <Avatar parts={avatarFor(profile ?? me, chosenLook)} size={84} />
          {/* 이름이 길어도 옆으로 넘치지 않는다. 좁은 폰에서 가로 스크롤이 생겼다 */}
          <h1 className="min-w-0 flex-1 text-[1.7rem] leading-tight font-extrabold break-words">
            {me.name}
            <span className="text-ink-soft block text-lg font-bold">오늘도 만나서 반가워!</span>
          </h1>
        </div>

        {/* 오늘 할 일 하나. 여러 개를 늘어놓지 않는다 */}
        <section>
          <SectionTitle>{finishedToday ? "오늘 한 일" : "오늘 할 운동"}</SectionTitle>
          {finishedToday ? (
            <div className="border-done bg-done-soft rounded-3xl border-2 p-5 text-center">
              <KidCharacter motion="cheer" size={120} className="mx-auto" animate />
              <p className="text-done mt-2 text-2xl font-extrabold">오늘 다 했어요</p>
            </div>
          ) : todo ? (
            <BigAction
              href={`/kid/m/${todo.missionId}`}
              title={todo.title ?? "오늘의 운동"}
              hint={todo.video?.title ?? "영상 보고 따라 하기"}
              motion="jump"
            />
          ) : suggestion ? (
            <BigAction
              href={`/kid/m/video-${suggestion.videoId}`}
              title={suggestion.title ?? "오늘의 운동"}
              hint={labelBadges(suggestion).join(" · ") || "영상 보고 따라 하기"}
              tag={why}
              thumbnail={suggestion.thumbnailUrl}
              art={videoArt(suggestion)}
              motion="stretch"
            />
          ) : (
            <div className="border-line rounded-3xl border-2 border-dashed p-6 text-center">
              <KidCharacter motion="rest" size={110} className="mx-auto" />
              <p className="mt-3 text-xl font-extrabold">오늘은 쉬는 날이에요</p>
              <p className="text-ink-soft mt-1 text-sm">쉬는 것도 하는 일이에요</p>
            </div>
          )}

          {/* 시작하기 전에도 부모를 부를 수 있어야 "같이 해 주는 것" 이 된다 */}
          <InviteParent
            familyId={familyId ?? ""}
            childProfileId={childProfileId ?? ""}
            className="mt-3"
          />

          {/*
            권한 것 하나만 걸려 있으면, 그게 하기 싫은 날은 그냥 안 한다.
            **목록으로 보내지 않는다** — 왜 바꾸고 싶은지 받고 그 이유에 맞는
            것을 골라 오는 자리로 보낸다.
          */}
          {(todo || suggestion) && (
            <NavLink
              href={`/kid/m/${todo ? todo.missionId : `video-${suggestion?.videoId}`}/swap`}
              className="press border-line mt-3 flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-base font-extrabold"
            >
              <Illustration name="item/item-target" fallback="item/item-clipboard" size={24} />
              다른 거 하고 싶어
            </NavLink>
          )}
        </section>

        {/* 내 점수 */}
        <PeerCloud score={score} tone="kid" label="또래 100명 중 내 자리" />

        {/* 이번 주에 한 날. 연속 기록으로 세지 않는다 — 빠진 날이 벌이 되면 안 된다 */}
        <WeekDots cheers={allCheers} fromProfileId={childProfileId ?? ""} />

        {/* 받은 기념 표시. 하나도 없으면 아예 안 나온다 */}
        <BadgeRow badges={badges} />

        {/*
          다시 열어 볼 것 셋. 아직 없는 것에 0 을 크게 띄우지 않는다 —
          첫 화면에 0 이 둘 나란히 있으면 시작하기도 전에 기죽는다.
        */}
        <section className="grid grid-cols-3 gap-2.5">
          <KidTile
            href="/kid/done"
            art="item/item-check-big"
            fallback="item/item-medal"
            label="본 영상"
            count={doneCount}
          />
          <KidTile
            href="/kid/praise"
            art="item/item-book"
            fallback="item/item-clipboard"
            label="칭찬"
            count={praises.length}
          />
          <KidTile href="/kid/me" art="char/face-cheer" fallback="item/item-medal" label="꾸미기" />
        </section>
      </Stage>
    </>
  );
}

/**
 * 아이가 누를 가장 큰 것.
 * 화면에 이만큼 큰 것이 둘 있으면 아이는 어느 쪽도 고르지 못한다.
 */
/** 아이가 다시 열어 보는 자리. 큰 숫자 하나와 이름만 둔다 */
function KidTile({
  href,
  art,
  fallback,
  label,
  count,
}: {
  href: string;
  art: string;
  fallback: string;
  label: string;
  /** 없으면 숫자 자리를 비운다. 0 은 띄우지 않는다 */
  count?: number;
}) {
  return (
    <NavLink
      href={href}
      className="press border-line flex flex-col items-center gap-1 rounded-2xl border-2 py-4"
    >
      <Illustration name={art} fallback={fallback} size={36} />
      {count != null && count > 0 && (
        <span className="board-num text-signal-deep text-xl leading-none">{count}</span>
      )}
      <span className="text-xs font-extrabold">{label}</span>
    </NavLink>
  );
}

/**
 * 오늘 할 운동 한 칸.
 *
 * 전에는 여기에 캐릭터를 세웠는데, 위 인사 자리의 아바타와 나란히 놓이면
 * **한 화면에 서로 다른 아이 둘**이 된다(아바타는 아이가 고른 모습이고
 * 캐릭터는 정해진 그림이다). 곧 볼 영상의 썸네일을 대신 보여준다 —
 * 무엇을 볼지 알려 주기도 한다.
 */
function BigAction({
  href,
  title,
  hint,
  tag,
  thumbnail,
  art,
  motion,
}: {
  href: string;
  title: string;
  hint: string;
  /** 왜 이걸 권하는지 한 마디. 없으면 안 붙인다 */
  tag?: string | null;
  /** 곧 볼 영상. 없으면 캐릭터를 세운다 */
  thumbnail?: string | null;
  /** 썸네일이 없을 때 대신 세울 그림 */
  art?: string | null;
  motion: "jump" | "stretch";
}) {
  return (
    <NavLink href={href} className="press bg-signal block rounded-3xl p-5 text-white">
      <div className="flex items-center gap-3">
        {thumbnail ? (
          <span className="relative block w-28 shrink-0 self-start overflow-hidden rounded-xl">
            <Image
              src={thumbnail}
              alt=""
              width={160}
              height={90}
              className="aspect-video w-full object-cover"
              unoptimized
            />
          </span>
        ) : art ? (
          /* 썸네일이 없으면 무엇을 키우는 운동인지 그림으로 세운다 */
          <span className="grid w-28 shrink-0 place-items-center self-start rounded-xl bg-white/25 py-3">
            <Illustration name={art} fallback="item/item-target" size={48} />
          </span>
        ) : (
          <KidCharacter motion={motion} size={96} animate />
        )}
        <div className="min-w-0 flex-1">
          {tag && (
            <span className="text-micro mb-1 inline-block rounded-md bg-white/25 px-2 py-0.5 font-extrabold">
              {tag}
            </span>
          )}
          <p className="line-clamp-2 text-[1.35rem] leading-snug font-extrabold">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm opacity-90">{hint}</p>
        </div>
      </div>
      {/* 흰 바탕에 파란 글씨. 파랑 위의 반투명 흰색은 눌리는 것으로 안 읽힌다 */}
      <span className="text-signal mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-xl font-extrabold">
        <Play className="size-5 fill-current" aria-hidden />
        시작하기
      </span>
    </NavLink>
  );
}

function KidHomeSkeleton() {
  return (
    <>
      <AppBar title="오늘" />
      <Stage wide className="space-y-7">
        <Skeleton className="h-16 w-56" />
        <div className="flex justify-center">
          <Skeleton className="size-52 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
