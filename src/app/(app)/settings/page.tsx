"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { PhotoSheet } from "@/components/domain/photo-sheet";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { ListRow } from "@/components/ui/list-row";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { useAuthStore } from "@/stores/auth-store";
import { useRoleStore } from "@/stores/role-store";

/**
 * 설정 — 계정과 이 기기에 관한 것만.
 *
 * 9/23 "너무 설정에 메뉴가 몰려 있다". 쓰는 자리가 따로 있는 것은 그리로 옮겼다 —
 * 가족 · 초대 · 참여 방식은 부모 홈의 가족 카드(가족 관리), 운동할 수 있는 시간은 짜는 화면 ·
 * 직접 짜기 · 캘린더, 즐겨찾기는 운동 찾기. 여기에는 누가 쓰는지 · 동의 · 로그아웃만 남는다.
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
  const [photoOpen, setPhotoOpen] = useState(false);

  return (
    <>
      <AppBar back title="설정" />
      <Stage wide className="space-y-3">
        {/* 지금 누구로 쓰고 있나. 한 기기를 부모와 아이가 번갈아 쓴다 */}
        <section className="card flex items-center gap-3">
          {/* 누르면 내 사진 바꾸기 */}
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label="내 사진 바꾸기"
            className="press grid size-12 shrink-0 place-items-center rounded-full"
          >
            <ProfileAvatar
              profileId={profile?.profileId}
              name={profile?.name}
              size="lg"
              tone={parentView ? "mark" : "signal"}
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-lead truncate font-extrabold">{profile?.name ?? "나"}</p>
            <p className="text-caption text-ink-soft mt-0.5">
              {family?.familyName ?? "우리집"} · {parentView ? "부모 화면" : "아이 화면"}
            </p>
          </div>
        </section>

        <ul className="card divide-rows py-1">
          {/* 탭바가 없으니 역할을 바꾸는 길이 여기다 */}
          <ListRow href="/start" art="icon/menu-switch" title="누가 쓰는지 바꾸기" />
          {parentView && (
            <ListRow href="/settings/consent" art="icon/menu-consent" title="보호자 동의" />
          )}
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
      {profile?.profileId && (
        <PhotoSheet
          open={photoOpen}
          onClose={() => setPhotoOpen(false)}
          profileId={profile.profileId}
          name={profile.name ?? "나"}
        />
      )}
    </>
  );
}
