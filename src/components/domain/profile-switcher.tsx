"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { Profile } from "@/lib/api/types";
import { avatarFor } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/illustration";
import { Sheet } from "@/components/ui/sheet";
import { useProfileStore } from "@/stores/profile-store";

/**
 * 지금 누구 화면을 보고 있는지 고른다.
 *
 * 계정과 사람이 다르기 때문에 필요하다. 부모 계정 하나가 온 가족 프로필을 관리한다.
 * 자녀를 고르면 화면이 통째로 아이 모드로 바뀐다 — 41세 부모와 6세 아이를
 * 한 화면으로 만족시킬 수 없어서다.
 */
export function ProfileSwitcher({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const currentId = useProfileStore((s) => s.currentProfileId);
  const setCurrent = useProfileStore((s) => s.setCurrentProfile);

  const current = profiles.find((p) => p.id === currentId) ?? profiles[0];
  if (!current) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press border-line flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1"
        aria-label={`보고 있는 사람 ${current.displayName}. 바꾸기`}
      >
        <Avatar parts={avatarFor(current)} size={26} />
        <span className="text-xs font-bold">{current.displayName}</span>
        <ChevronDown className="text-faint size-3.5" aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="누구 화면을 볼까요?">
        <ul className="space-y-1.5">
          {profiles.map((profile) => {
            const selected = profile.id === current.id;
            return (
              <li key={profile.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrent(profile.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "press flex w-full items-center gap-3 rounded-xl border p-3 text-left",
                    selected ? "border-signal bg-signal-soft" : "border-line",
                  )}
                >
                  <Avatar parts={avatarFor(profile)} size={44} />
                  <span className="flex-1">
                    <span className="block font-bold">{profile.displayName}</span>
                    <span className="text-ink-soft block text-xs">
                      {profile.age}세 · {profile.role === "PARENT" ? "부모" : "자녀"}
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
