"use client";

import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { LinkRow } from "@/components/domain/link-row";
import { useSession } from "@/lib/session";
import { useAuthStore } from "@/stores/auth-store";

/** 설정 허브 */
export default function SettingsPage() {
  const router = useRouter();
  const { profile } = useSession();
  const signOut = useAuthStore((s) => s.signOut);
  const isParent = profile?.role === "PARENT";

  return (
    <>
      <PageHeader eyebrow="SETTINGS" title="설정" back />
      <Screen className="space-y-6">
        <ul className="divide-rows">
          {/* 자녀 프로필에는 없는 설정들이라 줄 자체를 내지 않는다 */}
          {isParent && (
            <LinkRow
              href="/settings/support-mode"
              art="item/item-shoes"
              title="참여 방식"
              description="얼마나 같이 뛸지 정해요"
            />
          )}
          {isParent && (
            <LinkRow
              href="/settings/consent"
              art="item/item-clipboard"
              title="보호자 동의"
              description="만 14세 미만 가족의 건강정보 동의"
            />
          )}
          <LinkRow href="/videos/favorites" art="item/item-medal" title="즐겨찾기한 영상" />
        </ul>

        <Button
          size="block"
          variant="danger"
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
        >
          로그아웃
        </Button>

        <p className="text-faint text-[0.7rem] leading-relaxed">
          국민체력100 측정 데이터를 바탕으로 한 참고 정보입니다. 질병의 진단·치료를 위한 것이
          아니며, 건강에 관한 판단은 전문가와 상담하세요.
        </p>
      </Screen>
    </>
  );
}
