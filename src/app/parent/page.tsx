"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { SectionTitle, Stage } from "@/components/app-shell/stage";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreDial } from "@/components/domain/score-dial";
import { ChildSwitch } from "@/components/domain/child-switch";
import { PeerCompare } from "@/components/domain/peer-compare";
import { TodayBoard } from "@/components/domain/today-board";
import { UpdateNudge } from "@/components/domain/update-nudge";
import { useFitnessMap, useMissions } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";
import { withJosa } from "@/lib/utils";

/**
 * 부모 홈.
 *
 * 부모가 알고 싶은 건 하나다 — **우리 아이가 또래 중 어디쯤이고, 오늘 뭘 했는가.**
 * 그래서 화면 맨 위가 점수이고, 그 아래가 또래 비교이고, 그 아래가 오늘이다.
 *
 * 여기서 하지 않는 것: 아이를 다그치는 말, 구성원끼리 순위 매기기,
 * "이번 주 목표를 못 채웠습니다" 같은 성적표.
 */
export default function ParentHomePage() {
  const router = useRouter();
  const { familyId, profile, isPending } = useSession();
  const { data: map, isPending: mapPending } = useFitnessMap(familyId);
  const { data: missions } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });

  const childProfileId = useRoleStore((s) => s.childProfileId);
  const setChild = useRoleStore((s) => s.setChild);

  const children = (map?.members ?? []).filter((m) => m.role === "CHILD");
  // 고른 적이 없으면 첫째로 본다. 기본값을 저장해 두지 않는다 —
  // effect 안에서 상태를 쓰면 렌더가 한 번 더 돌고, 여기서는 굳이 저장할 것도 없다
  const child = children.find((c) => c.profileId === childProfileId) ?? children[0];

  if (isPending || mapPending) return <ParentHomeSkeleton />;

  const bar = (
    <AppBar
      title={map?.familyName ?? "우리집"}
      right={
        <Link
          href="/settings"
          aria-label="설정"
          className="press text-ink-soft grid size-10 place-items-center rounded-full"
        >
          <Settings className="size-5" />
        </Link>
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
          <h1 className="mt-4 text-xl font-extrabold">아이를 등록해 주세요</h1>
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
      <Stage className="space-y-8">
        {children.length > 1 && (
          <ChildSwitch kids={children} selectedId={child.profileId} onSelect={setChild} />
        )}

        {/* 1. 지금 어디쯤인가 */}
        <section className="pt-1">
          <ScoreDial score={score} size={196} label={`${child.name} 신체 점수`} />
        </section>

        {/* 2. 또래와 견주면 */}
        <PeerCompare name={child.name ?? "아이"} score={score} headline={child.headline} />

        {/* 3. 몸이 자랐다면 다시 재기 */}
        <UpdateNudge child={child} />

        {/* 4. 오늘 뭘 했나 — 도장은 여기서 찍는다 */}
        <section>
          <SectionTitle
            action={
              <Link href="/parent/history" className="text-signal text-xs font-bold">
                지난 기록
              </Link>
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

        {/* 5. 더 볼 것 */}
        <section>
          <SectionTitle>자세히 보기</SectionTitle>
          <ul className="divide-rows">
            <HomeLink
              href={`/parent/child/${child.profileId}`}
              art="item/item-compare"
              fallback="item/item-clipboard"
              title={`${withJosa(child.name ?? "아이", "은는")} 어떻게 자라고 있나`}
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
      </Stage>
    </>
  );
}

function HomeLink({
  href,
  art,
  fallback,
  title,
  description,
}: {
  href: string;
  art: string;
  fallback?: string;
  title: string;
  description?: string;
}) {
  return (
    <li>
      <Link href={href} className="press flex items-center gap-3 py-3.5">
        <Illustration name={art} fallback={fallback} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          {description && <span className="text-ink-soft mt-0.5 block text-xs">{description}</span>}
        </span>
      </Link>
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
