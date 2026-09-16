"use client";

import { Settings } from "lucide-react";
import { NavLink } from "@/components/ui/nav-link";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { SectionTitle, Stage } from "@/components/app-shell/stage";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Backdrop } from "@/components/ui/backdrop";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreDial } from "@/components/domain/score-dial";
import { ChildSwitch } from "@/components/domain/child-switch";
import { MyRow } from "@/components/domain/my-row";
import { PeerCompare } from "@/components/domain/peer-compare";
import { TodayBoard } from "@/components/domain/today-board";
import { UpdateNudge } from "@/components/domain/update-nudge";
import { useCoachRun, useFitnessMap, useLatestFitnessTest, useMissions } from "@/lib/api/queries";
import { useCoachRunId } from "@/stores/coach-store";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { withJosa } from "@/lib/utils";

/** 부모 홈. */
export default function ParentHomePage() {
  const router = useRouter();
  const { familyId, profile, isPending, error: sessionError } = useSession();
  const {
    data: map,
    isPending: mapPending,
    error: mapError,
    refetch: refetchMap,
    isRefetching,
  } = useFitnessMap(familyId);
  const { data: missions } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });

  // 이번 주 제안이 승인을 기다리고 있으면 여기서 먼저 말한다.
  // 승인 전에는 미션이 0건이라 「오늘」이 영원히 비어 보인다
  const runId = useCoachRunId(familyId);
  const { data: run } = useCoachRun(runId);

  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);

  const children = (map?.members ?? []).filter((m) => m.role === "CHILD");
  const myMember = map?.members?.find((m) => m.profileId === profile?.profileId);
  // 고른 적이 없으면 첫째로 본다. 기본값을 저장해 두지 않는다 —
  // effect 안에서 상태를 쓰면 렌더가 한 번 더 돌고, 여기서는 굳이 저장할 것도 없다
  const child = children.find((c) => c.profileId === childProfileId) ?? children[0];

  /** 실패를 기다림보다 먼저 본다. */
  const failure = sessionError ?? mapError;
  if (failure) {
    return (
      <>
        <AppBar title="우리집" />
        <Stage>
          <ErrorState error={failure} onRetry={() => void refetchMap()} retrying={isRefetching} />
        </Stage>
      </>
    );
  }

  if (isPending || mapPending) return <ParentHomeSkeleton />;

  const bar = (
    <AppBar
      title={map?.familyName ?? "우리집"}
      right={
        <NavLink
          href="/settings"
          aria-label="설정"
          className="press text-ink-soft grid size-10 place-items-center rounded-full"
        >
          <Settings className="size-5" />
        </NavLink>
      }
    />
  );

  // 아이를 아직 등록하지 않았다. 이 앱은 아이가 없으면 할 일이 없다
  if (!child) {
    return (
      <>
        {bar}
        <Stage className="flex flex-col items-center pt-10 text-center">
          <Illustration name="scene/scene-first-body" fallback="scene/scene-invite" size={150} />
          <h2 className="mt-4 text-xl font-extrabold">아이를 등록해 주세요</h2>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            이름과 키·몸무게만 있으면 또래 중 어디쯤인지 바로 볼 수 있어요.
          </p>
          <Button size="md" className="mt-5" onClick={() => router.push("/start/child")}>
            아이 등록하기
          </Button>
        </Stage>
      </>
    );
  }

  const score = child.latest?.overallPercentile ?? null;

  return (
    <>
      {bar}
      <Stage className="relative space-y-8">
        <Backdrop name="bg/bg-hill" height={210} />
        {children.length > 1 && (
          <ChildSwitch kids={children} selectedId={child.profileId} onSelect={setChild} />
        )}

        {/* 1. 지금 어디쯤인가 */}
        <section className="pt-1">
          <ScoreDial score={score} size={196} label={`${child.name} 신체 점수`} />
          <ScoreBasis profileId={child.profileId} />
        </section>

        {/* 2. 또래와 견주면 */}
        <PeerCompare
          name={child.name ?? "아이"}
          score={score}
          headline={child.headline}
          profileId={child.profileId}
        />

        {/* 3. 몸이 자랐다면 다시 재기 */}
        <UpdateNudge child={child} />

        {/* 4. 오늘 뭘 했나 — 칭찬은 여기서 보낸다 */}
        <section>
          <SectionTitle
            action={
              <NavLink
                href="/parent/history"
                className="text-signal -mr-2 inline-flex min-h-11 items-center px-2 text-xs font-bold"
              >
                지난 기록
              </NavLink>
            }
          >
            오늘
          </SectionTitle>
          <TodayBoard
            familyId={familyId ?? ""}
            childProfileId={child.profileId ?? ""}
            childName={child.name ?? "아이"}
            parentProfileId={profile?.profileId ?? ""}
            missions={missions?.missions}
          />
        </section>

        {/* 5. 이번 주 운동을 짜는 곳. 여기서 막히면 「오늘」이 영원히 빈칸이다 */}
        <section>
          <SectionTitle>이번 주</SectionTitle>
          <ul className="divide-rows">
            <HomeLink
              href="/coach/weekly"
              art="item/item-clipboard"
              /* 이미 승인한 주에 "짜 드릴까요" 라고 다시 물으면
                 방금 한 일이 없던 일이 된다 */
              title={run?.status === "APPROVED" ? "이번 주 제안" : "이번 주 운동 짜기"}
              description={
                run?.status === "AWAITING_APPROVAL"
                  ? "제안이 승인을 기다리고 있어요"
                  : run?.status === "RUNNING"
                    ? "코치가 만드는 중이에요"
                    : run?.status === "APPROVED"
                      ? "승인한 제안이 이번 주 미션으로 돌고 있어요"
                      : run?.status === "REJECTED"
                        ? "거절한 제안이에요. 다시 짜 볼 수 있어요"
                        : "가족 기록을 보고 코치가 한 주를 짜요"
              }
              badge={run?.status === "AWAITING_APPROVAL" ? "승인 기다림" : undefined}
            />
            <HomeLink
              href="/coach/chat"
              art="item/item-whistle"
              title="코치에게 묻기"
              description="답에는 어디서 찾았는지가 같이 붙어요"
            />
          </ul>
        </section>

        {/* 6. 아이를 더 자세히 */}
        <section>
          <SectionTitle>{withJosa(child.name ?? "아이", "은는")} 어떤가</SectionTitle>
          <ul className="divide-rows">
            <HomeLink
              href={`/parent/child/${child.profileId}`}
              art="item/item-compare"
              fallback="item/item-growth-up"
              title="어떻게 자라고 있나"
              description="점수와 키·몸무게 변화"
            />
            <HomeLink
              href={`/p/${child.profileId}/result`}
              art="item/item-clipboard"
              title="측정 결과 자세히"
              description="요인별로 어디가 강하고 어디를 키울지"
            />
            <HomeLink
              href={`/p/${child.profileId}/future`}
              art="deco/deco-arrow-up"
              title="10년 뒤"
              description="지금과 같은 조건의 10년 위 연령대"
            />
          </ul>
        </section>

        {/** 7. 부모 자신. */}
        <section>
          <SectionTitle>나도 함께</SectionTitle>
          <ul className="divide-rows">
            {/* 기획서 ① 가족 체력 지도 — 아이만 있고 부모가 없으면 잔소리 도구가 된다 */}
            <li>
              <MyRow me={myMember} />
            </li>
            <HomeLink
              href="/settings/support-mode"
              art="scene/scene-together"
              title="얼마나 같이 뛸지"
              description={SUPPORT_COPY[profile?.supportMode ?? "none"]}
            />
            <HomeLink
              href="/family/report"
              art="item/item-calendar"
              title="이번 주 우리 가족"
              description="누가 얼마나 움직였는지"
            />
          </ul>
        </section>
      </Stage>
    </>
  );
}

/** 이 점수가 몇 개 항목으로 나온 건지. */
function ScoreBasis({ profileId }: { profileId: string | undefined }) {
  const { data } = useLatestFitnessTest(profileId);
  const count = data?.items?.length ?? 0;
  if (count === 0 || count >= 3) return null;

  return (
    <p className="text-faint text-caption mt-1.5 text-center leading-relaxed">
      지금은 {count}개 항목으로 낸 점수예요. 더 재면 또래 비교가 정확해져요.
    </p>
  );
}

/** 참여 방식을 한 줄로. 고르지 않았으면 고르라고 말한다 */
const SUPPORT_COPY: Record<string, string> = {
  CHEER_ONLY: "응원할게요",
  WEEKEND: "주말에는 같이",
  FULL: "매번 같이",
  none: "아직 안 골랐어요",
};

function HomeLink({
  href,
  art,
  fallback,
  title,
  description,
  badge,
}: {
  href: string;
  art: string;
  fallback?: string;
  title: string;
  description?: string;
  /** 지금 손봐야 할 줄에만 붙인다. 모든 줄에 배지가 있으면 아무것도 눈에 안 띈다 */
  badge?: string;
}) {
  return (
    <li>
      <NavLink href={href} className="press flex items-center gap-3 py-3.5">
        <Illustration name={art} fallback={fallback} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          {description && <span className="text-ink-soft mt-0.5 block text-xs">{description}</span>}
        </span>
        {badge && (
          <span className="bg-signal text-micro shrink-0 rounded-full px-2.5 py-1 font-extrabold text-white">
            {badge}
          </span>
        )}
      </NavLink>
    </li>
  );
}

function ParentHomeSkeleton() {
  return (
    <>
      <AppBar title="우리집" />
      <Stage className="space-y-8">
        <div className="flex justify-center pt-2">
          <Skeleton className="size-49 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </Stage>
    </>
  );
}
