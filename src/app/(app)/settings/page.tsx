"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { PhotoSheet } from "@/components/domain/photo-sheet";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { ErrorState } from "@/components/ui/error-state";
import { ListRow } from "@/components/ui/list-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useFamilyProfiles } from "@/lib/api/queries";
import { useSession, useSignOut } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

/**
 * 설정 — 계정과 이 기기에 관한 것만.
 *
 * 9/23 "너무 설정에 메뉴가 몰려 있다". 쓰는 자리가 따로 있는 것은 그리로 옮겼다 —
 * 가족 · 초대 · 참여 방식은 부모 홈 「우리 가족」 → 가족 대시보드 · 가족 관리, 운동할 수 있는 시간은 짜는 화면 ·
 * 직접 짜기 · 캘린더, 즐겨찾기는 운동 찾기. 여기에는 누가 쓰는지 · 동의 · 로그아웃만 남는다.
 * 자녀 프로필에는 없는 줄은 비활성으로 두지 않고 아예 내지 않는다.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { profile, familyId, isPending, error, refetch } = useSession();
  const { data: family } = useFamilyProfiles(familyId);
  const signOut = useSignOut();
  const mode = useRoleStore((s) => s.mode);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const parentView = profile?.role === "PARENT" && mode !== "kid";
  // 지금 이 기기를 쓰는 사람 — 아이 화면이면 그 아이(부모 폰을 빌려 쓰는 중이다)
  const kidOnParentPhone = profile?.role === "PARENT" && mode === "kid";
  const me = kidOnParentPhone
    ? family?.profiles?.find((p) => p.profileId === childProfileId)
    : profile;
  const [photoOpen, setPhotoOpen] = useState(false);

  // 누구인지 받기 전에 「나 · 우리집 · 아이 화면」 을 그리면 로그아웃도 없이 아이 화면처럼 보였다
  if (isPending) {
    return (
      <>
        <AppBar back title="설정" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-20 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </Stage>
      </>
    );
  }

  const logout = (
    <button
      type="button"
      onClick={() => {
        router.replace("/login");
        signOut();
      }}
      className="card press text-ink-soft block w-full text-center text-sm font-bold"
    >
      로그아웃
    </button>
  );

  // 누구인지 못 받으면 「나 · 아이 화면」 으로 그리지 않는다. 로그아웃은 남긴다 — 나갈 길이다.
  // 아이 모드(부모 폰을 빌려 쓰는 중일 수 있다)에서는 내지 않는다 — 아이가 부모를 로그아웃시킨다
  if (error) {
    return (
      <>
        <AppBar back title="설정" />
        <Stage wide className="space-y-3">
          <ErrorState error={error} onRetry={() => void refetch()} />
          {mode !== "kid" && logout}
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar back title="설정" />
      <Stage wide className="space-y-3">
        {/* 지금 누구로 쓰고 있나. 한 기기를 부모와 아이가 번갈아 쓴다 */}
        <section className="card flex items-center gap-3">
          {/* 부모 화면에서만 누르면 내 사진 바꾸기 — 아이가 빌려 쓰는 중에 부모 사진을 바꾸지 않게 */}
          {parentView ? (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label="내 사진 바꾸기"
              className="press grid size-12 shrink-0 place-items-center rounded-full"
            >
              <ProfileAvatar profileId={me?.profileId} name={me?.name} size="lg" tone="mark" />
            </button>
          ) : (
            <ProfileAvatar profileId={me?.profileId} name={me?.name} size="lg" tone="signal" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lead truncate font-extrabold">{me?.name ?? "나"}</p>
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

        {/* 부모 폰을 빌려 쓰는 아이 화면에서는 로그아웃을 내지 않는다 — 눌러 버리면 곤란하다.
            자기 계정으로 들어온 아이는 나갈 수 있어야 한다 */}
        {!kidOnParentPhone && logout}
      </Stage>
      {parentView && profile?.profileId && (
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
