"use client";

import type { FitnessMapMember } from "@/lib/api/types";
import { Avatar } from "@/components/ui/illustration";
import { avatarFor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * 형제가 여럿일 때 누구를 볼지.
 *
 * 한 명뿐이면 아예 그리지 않는다. 고를 게 없는데 고르는 칸을 두면 자리만 먹는다.
 * **여기서 아이들을 나란히 놓고 점수를 비교하지 않는다.** 형제 사이 순위는
 * 이 앱이 하려는 말이 아니다 — 이름과 얼굴만 보여준다.
 */
export function ChildSwitch({
  kids,
  selectedId,
  onSelect,
}: {
  kids: FitnessMapMember[];
  selectedId: string | undefined;
  onSelect: (profileId: string) => void;
}) {
  if (kids.length < 2) return null;

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <ul className="flex gap-2">
        {kids.map((kid) => {
          const on = kid.profileId === selectedId;
          return (
            <li key={kid.profileId}>
              <button
                type="button"
                onClick={() => onSelect(kid.profileId ?? "")}
                aria-pressed={on}
                className={cn(
                  "press flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5",
                  on ? "border-signal bg-signal-soft" : "border-line",
                )}
              >
                <Avatar parts={avatarFor(kid)} size={28} />
                <span className="text-sm font-bold">{kid.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
