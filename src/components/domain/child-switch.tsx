"use client";

import type { FitnessMapMember } from "@/lib/api/types";
import { Avatar } from "@/components/ui/illustration";
import { avatarFor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** 형제가 여럿일 때 누구를 볼지. */
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
