"use client";

import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import { NotificationBell } from "@/components/domain/notification-bell";
import { IconLink } from "@/components/ui/icon-link";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

/**
 * 보호자 홈 머리의 「아이 화면」. 자기 폰이 없는 아이(계정이 붙지 않은 아이 프로필)가 있을 때만 둔다.
 * 그 아이는 보호자 폰을 빌려 쓴다. 폰이 있는 아이는 자기 폰에서 아이 화면을 쓰니 이 단추가 필요 없다.
 *
 * 그런 아이가 하나면 그 아이 홈으로, 여럿이면 누구인지 고르는 화면으로 간다. 이 기기를 아이 모드로
 * 바꾸는 건 아이 구역이 들어올 때 한다(`kid/layout`). 여기서 먼저 바꾸면 부모 구역이 /kid 로 한 번 더 보낸다
 */
export function KidScreenButton() {
  const router = useRouter();
  const { familyId } = useSession();
  const { data: family } = useFamilyProfiles(familyId);
  const setChild = useRoleStore((s) => s.setChild);

  const phoneless = (family?.profiles ?? []).filter((p) => p.role === "CHILD" && !p.hasAccount);
  if (phoneless.length === 0) return null;

  const open = () => {
    if (phoneless.length === 1) {
      setChild(phoneless[0].profileId ?? null);
      router.push("/kid");
      return;
    }
    router.push("/start/who");
  };

  return (
    <button type="button" onClick={open} className="chip press text-ink mr-1 px-3">
      아이 화면
    </button>
  );
}

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
