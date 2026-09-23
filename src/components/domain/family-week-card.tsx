"use client";

import { FamilyBridge } from "@/components/scene/family-bridge";
import { Card, CardHead } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import type { Uuid } from "@/lib/api/types";
import { useFamilyWeek } from "@/lib/api/queries";
import type { Stage } from "@/lib/levels";
import { weekOf } from "@/lib/today";
import { FAMILY_GOALS, usePrefsStore, type FamilyGoal } from "@/stores/prefs-store";

const GOAL_OPTIONS = FAMILY_GOALS.map((g) => ({
  value: String(g) as `${FamilyGoal}`,
  label: `${g}분`,
}));

/**
 * 우리 가족 다리 — 이번 주 가족이 같이 움직인 분으로 두 섬 사이에 다리를 놓는다.
 *
 * 애플 피트니스의 「공유」 · 삼성헬스 「투게더」 에서 가져오되 **겨루지 않는다** — 누가 몇 분인지
 * 나누지 않고 가족 합만 쓴다(규칙 10). 목표는 부모가 이 기기에서 고른다(60 · 90 · 120분,
 * 은영의 「주말 30분부터」). 아이 화면에서는 고르지 않고 보기만 한다.
 */
export function FamilyWeekCard({
  familyId,
  profileIds,
  stage,
  editable = false,
}: {
  familyId: Uuid | undefined;
  /** 가족 전부 — 부모도 아이도 */
  profileIds: Uuid[];
  /** 다리를 건너는 키움이 모습 */
  stage: Stage;
  /** 부모 화면 — 목표를 고를 수 있다 */
  editable?: boolean;
}) {
  const week = weekOf();
  const { minutes, pending } = useFamilyWeek(familyId, profileIds, week);
  const goal = usePrefsStore((s) => s.familyGoal);
  const setGoal = usePrefsStore((s) => s.setFamilyGoal);
  const left = Math.max(0, goal - minutes);

  return (
    <Card>
      <CardHead title="우리 가족 다리" meta={`이번 주 목표 ${goal}분`} />
      <div className="mt-1 flex items-baseline gap-2">
        <p className="metric-value text-metric">
          {pending ? "–" : minutes}
          <span className="metric-unit">분</span>
        </p>
        <p className="text-caption text-ink-soft font-semibold">
          {pending ? " " : left > 0 ? `다리까지 ${left}분 남았어요` : "다리가 이어졌어요!"}
        </p>
      </div>
      {pending ? (
        <Skeleton className="mt-2 aspect-[320/130] w-full rounded-2xl" />
      ) : (
        <FamilyBridge minutes={minutes} goal={goal} stage={stage} className="mt-1" />
      )}
      <p className="text-caption text-ink-soft mt-1">가족 누구든 움직인 만큼 널판이 놓여요</p>
      {editable && (
        <div className="border-line mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <p className="text-sm font-bold">이번 주 목표</p>
          <Segmented
            value={String(goal) as `${FamilyGoal}`}
            options={GOAL_OPTIONS}
            onChange={(v) => setGoal(Number(v) as FamilyGoal)}
            label="가족 목표"
          />
        </div>
      )}
    </Card>
  );
}
