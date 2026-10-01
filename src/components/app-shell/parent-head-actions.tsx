"use client";

import { Settings } from "lucide-react";

import { NotificationBell } from "@/components/domain/notification-bell";
import { IconLink } from "@/components/ui/icon-link";
import { useSession } from "@/lib/session";

/** 부모 탭 화면 머리 오른쪽의 알림과 설정. 설정은 탭에 넣지 않고 늘 여기에 둔다 */
export function ParentHeadActions() {
  const { profile } = useSession();
  return (
    <>
      <NotificationBell profileId={profile?.profileId ?? undefined} />
      <IconLink href="/settings" label="설정">
        <Settings className="size-6" strokeWidth={1.8} />
      </IconLink>
    </>
  );
}
