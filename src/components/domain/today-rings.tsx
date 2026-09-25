"use client";

import { ActivityRings } from "@/components/ui/activity-rings";
import type { DayLog, Mission } from "@/lib/api/types";
import { todayActivity } from "@/lib/activity";
import { useAvailability } from "@/lib/api/queries";

/**
 * 오늘 한 만큼 — 세 겹 링(애플 피트니스처럼).
 *
 *   바깥 파랑   움직인 시간 / 오늘 목표
 *   가운데 노랑 끝낸 운동 / 오늘 칸
 *   안 남색     이번 주 운동한 날 / 운동하기로 적어 둔 날
 *
 * 비어 있어도 탓하는 말을 붙이지 않는다. 링은 채워질 자리를 보여 줄 뿐이다.
 */
/**
 * 링 옆 숫자. 목표를 **넘기면** 「35 / 20분」 이 아니라 「35분」 — 한 바퀴는 이미 찼다.
 * 딱 맞으면 「4 / 4일」 그대로 둔다(채웠다는 말이다). 세 링이 같은 셈을 쓴다.
 */
function over(value: number, max: number, unit: string) {
  return value > max ? `${value}${unit}` : `${value} / ${max}${unit}`;
}

export function TodayRings({
  profileId,
  missions,
  weekLogs,
  size,
  className,
}: {
  profileId: string | undefined;
  missions: Mission[] | undefined;
  weekLogs: DayLog[] | undefined;
  size?: number;
  className?: string;
}) {
  const { data: availability } = useAvailability(profileId);
  const a = todayActivity({ profileId, missions, weekLogs, availability });
  // 쉬는 날에 움직이지 않은 것은 빈 목표가 아니다 — 「0 / 20분」 대신 「쉬는 날」
  const resting = a.rest && a.moved === 0;

  return (
    <ActivityRings
      size={size}
      className={className}
      rings={[
        {
          // 「이번 주」 묶음 안에 서도 오늘 것임을 이름이 말한다
          label: "오늘 움직인 시간",
          value: a.moved,
          max: a.goal,
          text: resting ? "쉬는 날" : over(a.moved, a.goal, "분"),
          color: "var(--color-signal)",
          track: "var(--color-signal-soft)",
        },
        {
          label: "오늘 끝낸 운동",
          value: a.done,
          max: a.total,
          text:
            a.total > 0 && !(resting && a.done === 0)
              ? over(a.done, a.total, "개")
              : resting
                ? "쉬는 날"
                : "아직 없어요",
          color: "var(--color-mark)",
          track: "var(--color-mark-soft)",
        },
        {
          label: "이번 주 운동한 날",
          value: a.days,
          max: a.target,
          text: over(a.days, a.target, "일"),
          color: "var(--color-signal-deep)",
          track: "var(--color-deep-soft)",
        },
      ]}
    />
  );
}
