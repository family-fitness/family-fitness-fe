"use client";

import { Heart, HeartHandshake, Repeat, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Initial } from "@/components/ui/initial";
import { ListRow } from "@/components/ui/list-row";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useAuthStore } from "@/stores/auth-store";
import { useRoleStore } from "@/stores/role-store";

/**
 * 설정.
 *
 * 헬스 앱의 설정처럼 줄을 묶음마다 흰 카드에 담는다 — 가족에 관한 것과 이 기기에 관한 것.
 * 자녀 프로필에는 없는 줄은 비활성으로 두지 않고 아예 내지 않는다.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { profile, familyId } = useSession();
  const { data: family } = useFamilyProfiles(familyId);
  const signOut = useAuthStore((s) => s.signOut);
  const resetRole = useRoleStore((s) => s.reset);
  const mode = useRoleStore((s) => s.mode);
  const parentView = profile?.role === "PARENT" && mode !== "kid";

  return (
    <>
      <AppBar back title="설정" />
      <Stage wide className="space-y-3">
        {/* 지금 누구로 쓰고 있나. 한 기기를 부모와 아이가 번갈아 쓴다 */}
        <section className="card flex items-center gap-3">
          <Initial name={profile?.name} size="lg" tone={parentView ? "mark" : "signal"} />
          <div className="min-w-0 flex-1">
            <p className="text-lead truncate font-extrabold">{profile?.name ?? "나"}</p>
            <p className="text-caption text-ink-soft mt-0.5">
              {family?.familyName ?? "우리집"} · {parentView ? "부모 화면" : "아이 화면"}
            </p>
          </div>
        </section>

        {parentView && (
          <ul className="card divide-rows py-1">
            <ListRow
              href="/parent/family"
              art="icon/menu-family"
              icon={Users}
              title="가족 관리 · 초대"
              description="아이를 등록하고 초대코드를 보내요"
            />
            <ListRow
              href="/settings/support-mode"
              art="icon/menu-support"
              icon={HeartHandshake}
              title="참여 방식"
              description="얼마나 같이 할지 정해요"
            />
            <ListRow
              href="/settings/consent"
              art="icon/menu-consent"
              icon={ShieldCheck}
              title="보호자 동의"
              description="만 14세 미만 가족의 건강정보 동의"
            />
          </ul>
        )}

        <ul className="card divide-rows py-1">
          {/* 탭바가 없으니 역할을 바꾸는 길이 여기다 */}
          <ListRow
            href="/start"
            art="icon/menu-switch"
            icon={Repeat}
            title="누가 쓰는지 바꾸기"
            description="부모 화면과 아이 화면을 오가요"
          />
          <ListRow
            href="/videos?list=favorites"
            art="icon/menu-favorite"
            icon={Heart}
            title="즐겨찾기한 영상"
          />
        </ul>

        {/* 아이 화면에서는 로그아웃을 내지 않는다. 부모 폰을 빌려 쓰다 눌러 버리면 곤란하다 */}
        {parentView && (
          <button
            type="button"
            onClick={() => {
              signOut();
              resetRole();
              router.replace("/login");
            }}
            className="card press text-ink-soft block w-full text-center text-sm font-bold"
          >
            로그아웃
          </button>
        )}

        <p className="text-caption text-ink-soft px-1 leading-relaxed">
          국민체력100 측정 데이터를 바탕으로 한 참고 정보입니다. 질병의 진단·치료를 위한 것이
          아니며, 건강에 관한 판단은 전문가와 상담하세요.
        </p>
      </Stage>
    </>
  );
}
