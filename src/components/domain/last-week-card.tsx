"use client";

import { X } from "lucide-react";

import { Card, CardHead } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Uuid } from "@/lib/api/types";
import { useCalendar, useProgress } from "@/lib/api/queries";
import { isEmpty, rangeLabel, weekRecap } from "@/lib/recap";
import { daysBefore, weekOf, weekdayOf } from "@/lib/today";
import { withJosa } from "@/lib/utils";
import { usePrefsStore } from "@/stores/prefs-store";

/**
 * 지난주 돌아보기 — 한 주가 시작되면 부모 홈에 뜨고, 닫으면 다음 주까지 안 뜬다.
 *
 * 삼성헬스 「주간 리포트」 에서 가져왔다. **해낸 것만 적는다** — 지난주보다 적었다거나
 * 빠진 날이 있었다는 말은 없다. 적을 것이 하나도 없으면 카드를 띄우지 않는다(쉬었는지 이제
 * 막 온 집인지 모른다). 기록을 못 받았을 때도 띄우지 않는다 — 없는 것과 못 받은 것은 다르다.
 */
export function LastWeekCard({
  familyId,
  childProfileId,
  childName,
}: {
  familyId: Uuid | undefined;
  childProfileId: Uuid | undefined;
  childName: string;
}) {
  const thisWeek = weekOf();
  const last = weekOf(daysBefore(7, thisWeek.from));
  const closedWeek = usePrefsStore((s) =>
    childProfileId && s.recapClosed && typeof s.recapClosed === "object"
      ? s.recapClosed[childProfileId]
      : undefined,
  );
  const close = usePrefsStore((s) => s.closeRecap);
  const { data: calendar, isPending, error } = useCalendar(familyId, childProfileId, last);
  const { data: progress } = useProgress(childProfileId);

  if (!childProfileId || closedWeek === thisWeek.from || error) return null;
  // 기다리는 동안 같은 자리를 잡아 둔다 — 늦게 튀어나와 아래 카드를 밀지 않게
  if (isPending) return <Skeleton className="h-44 w-full rounded-3xl" />;

  const recap = weekRecap(calendar?.days ?? [], progress?.achievements ?? [], last);
  if (isEmpty(recap)) return null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <CardHead
          title="지난주 돌아보기"
          meta={rangeLabel(last.from, last.to)}
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => close(childProfileId, thisWeek.from)}
          aria-label="지난주 돌아보기 닫기"
          className="press text-ink-soft -mt-2 -mr-2 grid size-10 shrink-0 place-items-center rounded-full"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      {recap.days > 0 && (
        <p className="mt-1 flex items-baseline gap-2">
          <span className="metric-value text-metric">
            {recap.days}
            <span className="metric-unit">일</span>
          </span>
          <span className="text-caption text-ink-soft font-semibold">
            {withJosa(childName, "이가")} 모두 {recap.minutes}분 움직였어요
          </span>
        </p>
      )}
      <ul className="divide-rows border-line mt-3 border-t text-sm">
        {recap.best && (
          <li className="flex justify-between py-2.5">
            <span className="text-ink-soft">가장 많이 한 날</span>
            <span className="font-bold">
              {weekdayOf(recap.best.date)}요일 · {recap.best.minutes}분
            </span>
          </li>
        )}
        {recap.stickers > 0 && (
          <li className="flex justify-between py-2.5">
            <span className="text-ink-soft">받은 칭찬 스티커</span>
            <span className="font-bold">{recap.stickers}장</span>
          </li>
        )}
        {recap.badges.length > 0 && (
          <li className="flex justify-between gap-3 py-2.5">
            <span className="text-ink-soft shrink-0">새 업적</span>
            <span className="text-right font-bold">{recap.badges.join(" · ")}</span>
          </li>
        )}
      </ul>
    </Card>
  );
}
