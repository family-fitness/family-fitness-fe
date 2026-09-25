"use client";

import { ProfileAvatar } from "@/components/domain/profile-avatar";
import type { FitnessMapMember } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** 형제가 여럿일 때 누구를 볼지. 한 명이면 그리지 않는다 */
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
    <div className="scroll-row -mx-4 px-4">
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
                  "press flex min-h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1",
                  on ? "bg-signal-strong text-white" : "bg-paper shadow-card",
                )}
              >
                <ProfileAvatar
                  profileId={kid.profileId}
                  name={kid.name}
                  size="sm"
                  tone={on ? "sub" : "signal"}
                />
                <span className="text-sm font-bold">{kid.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
