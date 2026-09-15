"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { ProfileSummary } from "@/lib/api/types";
import { avatarFor } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/illustration";
import { Sheet } from "@/components/ui/sheet";
import { useSessionStore } from "@/stores/session-store";

/**
 * 지금 누구 화면을 보고 있는지 고른다.
 *
 * 계정과 사람이 다르기 때문에 필요하다. 부모 계정 하나가 온 가족 프로필을 관리한다.
 * 자녀를 고르면 화면이 통째로 아이 모드로 바뀐다.
 */
export function ProfileSwitcher({
  profiles,
  current,
}: {
  profiles: ProfileSummary[];
  current: ProfileSummary | undefined;
}) {
  const [open, setOpen] = useState(false);
  const setCurrentProfile = useSessionStore((s) => s.setCurrentProfile);

  if (!current || profiles.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press border-line flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1"
        aria-label={`보고 있는 사람 ${current.name}. 바꾸기`}
      >
        <Avatar parts={avatarFor(current)} size={26} />
        <span className="text-xs font-bold">{current.name}</span>
        <ChevronDown className="text-faint size-3.5" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="누구 화면을 볼까요?">
        <ul className="space-y-1.5">
          {profiles.map((profile) => {
            const selected = profile.profileId === current.profileId;
            return (
              <li key={profile.profileId}>
                <button
                  type="button"
                  onClick={() => {
                    if (profile.profileId) setCurrentProfile(profile.profileId);
                    setOpen(false);
                  }}
                  className={cn(
                    "press flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                    selected ? "border-signal bg-signal-soft" : "border-line",
                  )}
                >
                  <Avatar parts={avatarFor(profile)} size={44} />
                  <span className="flex-1">
                    <span className="block font-bold">{profile.name}</span>
                    <span className="text-ink-soft block text-xs">
                      {profile.ageGroup} · {profile.role === "PARENT" ? "부모" : "자녀"}
                    </span>
                  </span>
                  {selected && <span className="text-signal text-xs font-bold">보는 중</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
