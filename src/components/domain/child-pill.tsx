"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { NavLink } from "@/components/ui/nav-link";
import { Sheet } from "@/components/ui/sheet";
import type { FitnessMapMember } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * 보고 있는 아이 — 부모 홈 오른쪽 위의 이름 알약(닥터아이처럼, 9/25).
 *
 * 아이가 여럿이면 여기서 바로 바꾼다. 하나여도 알약은 선다 — 누가 화면의 주인공인지,
 * 아이를 더하려면 어디를 누르는지가 늘 같은 자리에 있어야 한다. 고른 아이는 이 기기에 남아
 * 캘린더 · 운동 짜기 · 운동 찾기도 그 아이로 연다(`role-store`).
 */
export function ChildPill({
  kids,
  selectedId,
  onSelect,
}: {
  kids: FitnessMapMember[];
  selectedId: string | undefined;
  onSelect: (profileId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = kids.find((k) => k.profileId === selectedId) ?? kids[0];
  if (!current) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`보고 있는 아이 ${current.name ?? ""} · 바꾸기`}
        className="press bg-signal-soft text-signal-deep mr-1 flex min-h-11 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1.5 text-sm font-extrabold"
      >
        <ProfileAvatar
          profileId={current.profileId}
          name={current.name}
          size="sm"
          tone="sub"
          className="bg-paper text-signal-deep"
        />
        <span className="max-w-20 truncate">{current.name}</span>
        <ChevronDown aria-hidden className="size-4" strokeWidth={2.6} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="누구를 볼까요">
        <ul className="divide-rows">
          {kids.map((k) => {
            const on = k.profileId === current.profileId;
            return (
              <li key={k.profileId}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    onSelect(k.profileId ?? "");
                    setOpen(false);
                  }}
                  className="press flex min-h-14 w-full items-center gap-3 text-left"
                >
                  <ProfileAvatar
                    profileId={k.profileId}
                    name={k.name}
                    tone={on ? "signal" : "sub"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-extrabold", on && "text-signal-deep")}>
                      {k.name}
                    </span>
                    {k.ageGroup && (
                      <span className="text-caption text-ink-soft block">{k.ageGroup}</span>
                    )}
                  </span>
                  {on && <Check aria-hidden className="text-signal-deep size-5" strokeWidth={3} />}
                </button>
              </li>
            );
          })}
        </ul>
        <NavLink
          href="/start/child"
          onClick={() => setOpen(false)}
          className="press bg-sub mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold"
        >
          <Plus aria-hidden className="size-4" strokeWidth={2.6} />
          아이 등록하기
        </NavLink>
      </Sheet>
    </>
  );
}
