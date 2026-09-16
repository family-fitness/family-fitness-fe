"use client";

import { Play, Settings } from "lucide-react";
import { NavLink } from "@/components/ui/nav-link";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { SectionTitle, Stage } from "@/components/app-shell/stage";
import { ErrorState } from "@/components/ui/error-state";
import { Backdrop } from "@/components/ui/backdrop";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter } from "@/components/domain/kid-character";
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
import { isVideoDone } from "@/lib/mission";
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
  const suggestion = videos?.videos?.[0];
  const doneCount = (watched?.videos ?? []).filter((v) => isVideoDone(v.maxProgress)).length;
  const allCheers = cheerLog?.cheers ?? [];
  const praises = allCheers.filter((c) => c.toProfileId === childProfileId && c.message);

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
        <Backdrop name="bg/bg-sky" height={230} />
        {/* 이름을 크게. 아이는 자기 이름을 먼저 찾는다.
            막대에 또 적지 않는다 — 한 화면에 같은 이름이 두 번 뜬다 */}
        <div className="flex items-center gap-2">
          <KidCharacter motion="wave" size={84} />
          <h1 className="text-[1.7rem] leading-tight font-extrabold">
            {me.name}
            <span className="text-ink-soft block text-lg font-bold">오늘도 만나서 반가워!</span>
          </h1>
        </div>

        {/* 내 점수 */}
        <PeerCloud score={score} tone="kid" label="또래 100명 중 내 자리" />

        {/* 이번 주에 한 날. 연속 기록으로 세지 않는다 — 빠진 날이 벌이 되면 안 된다 */}
        <WeekDots cheers={allCheers} fromProfileId={childProfileId ?? ""} />

        {/* 오늘 할 일 하나. 여러 개를 늘어놓지 않는다 */}
        <section>
          <SectionTitle>오늘 할 운동</SectionTitle>
          {todo ? (
            <BigAction
              href={`/kid/play/${todo.missionId}`}
              title={todo.title ?? "오늘의 운동"}
              hint={todo.video?.title ?? "영상 보고 따라 하기"}
              motion="jump"
            />
          ) : suggestion ? (
            <BigAction
              href={`/kid/play/video-${suggestion.videoId}`}
              title={suggestion.title ?? "오늘의 운동"}
              hint={suggestion.badges?.join(" · ") ?? "영상 보고 따라 하기"}
              motion="stretch"
            />
          ) : (
            <div className="border-line rounded-3xl border-2 border-dashed p-6 text-center">
              <KidCharacter motion="tired" size={110} className="mx-auto" />
              <p className="mt-3 text-xl font-extrabold">오늘은 쉬는 날이에요</p>
              <p className="text-ink-soft mt-1 text-sm">쉬는 것도 하는 일이에요</p>
            </div>
          )}

          {/* 권한 것 하나만 걸려 있으면, 그게 하기 싫은 날은 그냥 안 한다 */}
          <NavLink
            href="/kid/pick"
            className="press border-line mt-3 flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-base font-extrabold"
          >
            <Illustration name="item/item-dice" fallback="item/item-target" size={24} />
            다른 운동 고르기
          </NavLink>
        </section>

        {/* 아이가 다시 열어 볼 것 둘. 이게 없으면 운동 한 번 하고 닫는 앱이 된다 */}
        <section className="grid grid-cols-2 gap-3">
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
  count: number;
}) {
  return (
    <NavLink
      href={href}
      className="press border-line flex flex-col items-center gap-1 rounded-3xl border-2 py-5"
    >
      <Illustration name={art} fallback={fallback} size={40} />
      <span className="board-num text-signal-deep text-2xl leading-none">{count}</span>
      <span className="text-sm font-extrabold">{label}</span>
    </NavLink>
  );
}

function BigAction({
  href,
  title,
  hint,
  motion,
}: {
  href: string;
  title: string;
  hint: string;
  motion: "jump" | "stretch";
}) {
  return (
    <NavLink href={href} className="press bg-signal block rounded-3xl p-5 text-white">
      <div className="flex items-center gap-3">
        <KidCharacter motion={motion} size={96} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[1.35rem] leading-snug font-extrabold">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm opacity-90">{hint}</p>
        </div>
      </div>
      <span className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white/20 py-3.5 text-xl font-extrabold">
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
