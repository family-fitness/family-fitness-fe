"use client";

import { Play, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { SectionTitle, Stage } from "@/components/app-shell/stage";
import { ErrorState } from "@/components/ui/error-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { KidCharacter } from "@/components/domain/kid-character";
import { ScoreDial } from "@/components/domain/score-dial";
import { StampMark } from "@/components/domain/stamp-mark";
import { WeekDots } from "@/components/domain/week-dots";
import { SpriteField } from "@/components/scene/sprite-field";
import {
  useCheers,
  useFamilyProfiles,
  useFitnessMap,
  useMissions,
  useVideos,
} from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

/**
 * 아이 홈.
 *
 * **누를 것이 하나여야 한다.** 아이는 화면을 읽지 않고 제일 큰 것을 누른다.
 * 그래서 오늘의 운동 하나만 크게 두고, 나머지는 그 아래로 내린다.
 *
 * 여기서 보여주지 않는 것(AGENTS.md 규칙 10 · 아이 모드)
 *   - 등급, 순위, 형제 비교
 *   - 약한 항목. "너는 유연성이 약해" 를 아이에게 말하지 않는다
 *   - 못 한 날에 대한 지적
 */
/** 컴포넌트 밖에 둔다. 안에서 만들면 렌더마다 새 배열이라 WebGL 이 다시 만들어진다 */
const DRIFT_ASSETS = ["deco/deco-sparkle", "deco/deco-cloud-1", "deco/deco-cloud-2"];

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
  /*
    가족의 도장·알림을 한 번에 받아 두 갈래로 쓴다.
      받은 도장 = 나에게 온 것
      움직인 날 = 내가 보낸 것("다 했어요")
    받는 쪽만 불러오면 이번 주 달력이 늘 비어 있다.
  */
  const { data: cheerLog } = useCheers(familyId);

  const me = map?.members?.find((m) => m.profileId === childProfileId);
  const profile = family?.profiles?.find((p) => p.profileId === childProfileId);

  // 미션이 없어도 할 게 있어야 한다. 연령대에 맞는 영상을 하나 권한다
  const { data: videos } = useVideos({ list: "ALL", ageGroup: profile?.ageGroup });

  // /me 가 실패하면 가족 지도는 시작도 못 한다. 실패를 기다림보다 먼저 본다
  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar title="" />
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
  const allCheers = cheerLog?.cheers ?? [];
  const stamps = allCheers.filter((c) => c.toProfileId === childProfileId);

  return (
    <>
      <AppBar
        title=""
        right={
          <Link
            href="/settings"
            aria-label="설정"
            className="press text-faint grid size-10 place-items-center rounded-full"
          >
            <Settings className="size-5" />
          </Link>
        }
      />

      <Stage wide className="relative space-y-7">
        {/* 배경에 조각이 천천히 떠다닌다. 아이 화면은 부모 화면보다 놀이처럼 보여도 된다 */}
        <SpriteField
          assets={DRIFT_ASSETS}
          count={9}
          speed={0.5}
          opacity={0.14}
          scale={[14, 30]}
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64"
        />

        {/* 이름을 크게. 아이는 자기 이름을 먼저 찾는다 */}
        <div className="flex items-center gap-2">
          <KidCharacter motion="wave" size={84} />
          <p className="text-[1.7rem] leading-tight font-extrabold">
            {me.name}
            <span className="text-ink-soft block text-lg font-bold">오늘도 만나서 반가워!</span>
          </p>
        </div>

        {/* 내 점수 */}
        <ScoreDial score={score} size={210} tone="kid" label="또래 100명 중 내 자리" />

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
              <p className="text-ink-soft mt-1 text-sm">새 운동이 생기면 여기에 나와요</p>
            </div>
          )}
        </section>

        {/* 받은 도장 */}
        <section>
          <SectionTitle
            action={
              stamps.length > 0 ? (
                <Link href="/kid/stamps" className="text-signal text-sm font-bold">
                  모두 보기
                </Link>
              ) : undefined
            }
          >
            받은 도장
          </SectionTitle>

          {stamps.length === 0 ? (
            <div className="border-line flex items-center gap-3 rounded-2xl border border-dashed p-4">
              <Illustration
                name="scene/scene-waiting-stamp"
                fallback="scene/scene-waiting-approval"
                size={52}
              />
              <p className="text-ink-soft text-sm leading-relaxed">
                운동을 마치면 부모님이 도장을 찍어 줘요.
              </p>
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2.5">
              {stamps.slice(0, 8).map((c) => (
                <li
                  key={c.cheerId}
                  className="bg-mark-soft grid size-16 place-items-center rounded-2xl"
                >
                  <StampMark stamp={c.stamp} size={46} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </Stage>
    </>
  );
}

/**
 * 아이가 누를 가장 큰 것.
 * 화면에 이만큼 큰 것이 둘 있으면 아이는 어느 쪽도 고르지 못한다.
 */
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
    <Link href={href} className="press bg-signal block rounded-3xl p-5 text-white">
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
    </Link>
  );
}

function KidHomeSkeleton() {
  return (
    <>
      <AppBar title="" />
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
