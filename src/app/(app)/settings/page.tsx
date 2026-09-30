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
import { useFamilyProfiles, useMe } from "@/lib/api/queries";
import type { MeWithEmail } from "@/lib/api/types";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/legal";
import { useSession, useSignOut } from "@/lib/session";
import { useRoleStore } from "@/stores/role-store";

/** 빌드할 때 next.config.ts 가 package.json 의 version 만 박는다. package.json 을 import 하면 통째로 번들에 들어간다 */
const version = process.env.NEXT_PUBLIC_APP_VERSION;

/**
 * 설정 — 로그인 계정 · 누가 쓰는지 · 동의 · 약관 · 앱 정보 · 로그아웃(9/28 「설정에 이런 식으로」).
 *
 * 쓰는 자리가 따로 있는 것은 그리로 옮겼다(9/23) — 가족 · 초대 · 참여 방식은 가족 관리, 운동할 수 있는 시간은
 * 짜는 화면 · 직접 짜기 · 캘린더, 즐겨찾기는 운동 찾기. 자녀 프로필에는 없는 줄은 비활성으로 두지 않고 아예 내지 않는다.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { profile, familyId, isPending, error, refetch } = useSession();
  const { data: me } = useMe();
  const { data: family } = useFamilyProfiles(familyId);
  const signOut = useSignOut();
  const mode = useRoleStore((s) => s.mode);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const parentView = profile?.role === "PARENT" && mode !== "kid";
  // 부모 폰을 빌려 쓰는 아이 화면 — 로그아웃을 내지 않는다(아이가 누르면 곤란하다)
  const kidOnParentPhone = profile?.role === "PARENT" && mode === "kid";
  const kid = kidOnParentPhone
    ? family?.profiles?.find((p) => p.profileId === childProfileId)
    : undefined;
  // ▲ 서버가 아직 주지 않는다 — 오면 로그인 계정 아래에 둔다
  const email = (me as MeWithEmail | undefined)?.email;
  const [photoOpen, setPhotoOpen] = useState(false);

  // 누구인지 받기 전에 「나 · 우리집 · 아이 화면」 을 그리면 로그아웃도 없이 아이 화면처럼 보였다
  if (isPending) {
    return (
      <>
        <AppBar back title="설정" />
        <Stage wide className="space-y-3">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </Stage>
      </>
    );
  }

  const logOut = () => {
    router.replace("/login");
    signOut();
  };

  const logoutLink = (
    <button
      type="button"
      onClick={logOut}
      className="press text-ink-soft min-h-11 px-4 text-sm font-bold underline underline-offset-4"
    >
      로그아웃
    </button>
  );

  // 누구인지 못 받으면 「나 · 아이 화면」 으로 그리지 않는다. 로그아웃은 남긴다 — 나갈 길이다.
  if (error) {
    return (
      <>
        <AppBar back title="설정" />
        <Stage wide className="space-y-3">
          <ErrorState error={error} onRetry={() => void refetch()} />
          {mode !== "kid" && <div className="flex justify-center">{logoutLink}</div>}
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar back title="설정" />
      <Stage wide className="space-y-3">
        <section className="card">
          <p className="text-caption text-ink-soft font-bold">로그인 계정</p>
          <div className="mt-2 flex items-center gap-3">
            {/* 부모 화면에서만 누르면 내 사진 바꾸기 — 아이가 빌려 쓰는 중에 부모 사진을 바꾸지 않게 */}
            {parentView ? (
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
                  tone="mark"
                />
              </button>
            ) : (
              <ProfileAvatar
                profileId={profile?.profileId}
                name={profile?.name}
                size="lg"
                tone={profile?.role === "CHILD" ? "signal" : "mark"}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lead truncate font-extrabold">{profile?.name ?? "나"}</p>
              {email && <p className="text-caption text-ink-soft mt-0.5 truncate">{email}</p>}
              <p className="text-caption text-ink-soft mt-0.5">
                {family?.familyName ?? "우리집"} ·{" "}
                {parentView ? "부모 화면" : `아이 화면${kid?.name ? ` · ${kid.name}` : ""}`}
              </p>
            </div>
          </div>
        </section>

        <ul className="card divide-rows py-1">
          {/* 탭바가 없으니 역할을 바꾸는 길이 여기다 */}
          <ListRow href="/start" art="icon/menu-switch" title="누가 쓰는지 바꾸기" />
          {parentView && (
            <ListRow href="/settings/consent" art="icon/menu-consent" title="보호자 동의" />
          )}
        </ul>

        <ul className="card divide-rows py-1">
          <ListRow href={PRIVACY_HREF} title="개인정보처리방침" />
          <ListRow href={TERMS_HREF} title="이용약관" />
        </ul>

        <section className="card">
          <p className="font-extrabold">우리가족 체력키움</p>
          <p className="text-ink-soft mt-1 text-sm">
            국민체력100 데이터로 그리는 우리 가족 체력 지도
          </p>
          <p className="text-ink-soft mt-1 text-sm">버전 {version}</p>
        </section>

        {!kidOnParentPhone && <div className="flex justify-center pt-1">{logoutLink}</div>}
      </Stage>
      {parentView && profile?.profileId && (
        <PhotoSheet
          open={photoOpen}
          onClose={() => setPhotoOpen(false)}
          profileId={profile.profileId}
          name={profile.name ?? "나"}
          tone="mark"
        />
      )}
    </>
  );
}
