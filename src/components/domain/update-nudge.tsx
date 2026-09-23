import { Card, CardHead } from "@/components/ui/card";
import type { FitnessMapMember } from "@/lib/api/types";
import { daysSince } from "@/lib/today";
import { withJosa } from "@/lib/utils";
import { ArtIcon } from "@/components/ui/art-icon";

/**
 * 며칠이 지나면 다시 재자고 말할지.
 *
 * 아이 키는 한 달에도 달라진다(회의: "한 달이면 5cm 큰 아이도 있다"). 지난 키로 계속
 * 견주면 점수가 틀어진다. 알림과 같은 기준이다.
 */
export const REMEASURE_DAYS = 30;

/** 다시 재자고 말하는 카드. 막지 않고, "오래됐어요" 라고 탓하지 않는다(규칙 11) */
export function UpdateNudge({ child }: { child: FitnessMapMember }) {
  const days = daysSince(child.latest?.testedOn);
  if (days == null || days < REMEASURE_DAYS) return null;

  return (
    <Card href={`/parent/update/${child.profileId}`} label="키와 몸무게 새로 재기">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-mark-soft text-ink grid size-11 shrink-0 place-items-center rounded-2xl"
        >
          <ArtIcon name="icon/menu-measure" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <CardHead title="키 · 몸무게를 새로 잴 때예요" chevron />
          <p className="text-caption text-ink-soft">
            {withJosa(child.name ?? "아이", "은는")} 한 달 사이에도 자라요. 지난번에 잰 지 {days}일
            됐어요
          </p>
        </div>
      </div>
    </Card>
  );
}
