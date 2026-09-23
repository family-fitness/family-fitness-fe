"use client";

import { Bell } from "lucide-react";

import { IconLink } from "@/components/ui/icon-link";
import { useNotifications } from "@/lib/api/queries";

/**
 * 알림 종 — 홈 오른쪽 위, 설정 톱니 옆.
 *
 * 안 읽은 게 있으면 **점 하나**. 숫자를 달지 않는다 — 「3」 이 붙으면 해치워야 할 일이 된다.
 */
export function NotificationBell({ profileId }: { profileId: string | undefined }) {
  const { data } = useNotifications(profileId);
  const fresh = (data?.unread ?? 0) > 0;

  return (
    <IconLink href="/notifications" label={fresh ? "알림 · 새로 온 것 있음" : "알림"}>
      <span className="relative">
        <Bell className="size-6" strokeWidth={1.8} />
        {fresh && (
          <span
            aria-hidden
            className="bg-signal ring-ground absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2"
          />
        )}
      </span>
    </IconLink>
  );
}
