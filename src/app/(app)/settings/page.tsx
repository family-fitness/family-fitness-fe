"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { PhotoSheet } from "@/components/domain/photo-sheet";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { useFamilyProfiles, useMe, useWithdraw } from "@/lib/api/queries";
import type { MeWithEmail, ProfileSummary } from "@/lib/api/types";
import { errorMessage } from "@/lib/errors";
import { PRIVACY_HREF, TERMS_HREF } from "@/lib/legal";
import { useSession, useSignOut } from "@/lib/session";
import { WITHDRAWAL_COPY, WITHDRAWN_PATH, withdrawalCase } from "@/lib/withdrawal";
import { useRoleStore } from "@/stores/role-store";

/** 빌드할 때 next.config.ts 가 package.json 의 version 만 박는다. package.json 을 import 하면 통째로 번들에 들어간다 */
const version = process.env.NEXT_PUBLIC_APP_VERSION;

/**
 * 설정 — 로그인 계정 · 누가 쓰는지 · 동의 · 약관 · 앱 정보 · 로그아웃(9/28 「설정에 이런 식으로」).
 * 로그아웃 아래에 계정 탈퇴가 있다.
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
  // 부모 폰을 빌려 쓰는 아이 화면. 로그아웃과 계정 탈퇴를 내지 않는다(아이가 누르면 곤란하다)
  const kidOnParentPhone = profile?.role === "PARENT" && mode === "kid";
  const kid = kidOnParentPhone
    ? family?.profiles?.find((p) => p.profileId === childProfileId)
    : undefined;
  // ▲ 서버가 아직 주지 않는다 — 오면 로그인 계정 아래에 둔다
  const email = (me as MeWithEmail | undefined)?.email;
  const [photoOpen, setPhotoOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

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
              <p className="text-caption text-ink-soft mt-0.5 flex flex-wrap gap-x-2">
                <span>{family?.familyName ?? "우리집"}</span>
                <span>
                  {parentView ? "부모 화면" : `아이 화면${kid?.name ? `(${kid.name})` : ""}`}
                </span>
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
          <ListRow href={PRIVACY_HREF} title="개인정보 처리방침" />
          <ListRow href={TERMS_HREF} title="이용약관" />
        </ul>

        <section className="card">
          {/* 이름 · 버전만 — 「…그리는 우리 가족 체력 지도」 같은 소개 줄은 설명 문구다(9/25) */}
          <p className="font-extrabold">우리가족 체력키움</p>
          <p className="text-ink-soft mt-1 text-sm">버전 {version}</p>
        </section>

        {!kidOnParentPhone && (
          <div className="flex flex-col items-center pt-1">
            {logoutLink}
            {/* 되돌릴 수 없는 일이라 로그아웃 아래에 작게. 누르면 누가 탈퇴하는지에 맞춘 확인 시트가 뜬다 */}
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className="press text-signal-deep text-caption min-h-11 px-4 font-bold underline underline-offset-4"
            >
              계정 탈퇴
            </button>
          </div>
        )}
      </Stage>
      {!kidOnParentPhone && (
        <WithdrawSheet
          open={withdrawOpen}
          onClose={() => setWithdrawOpen(false)}
          me={profile}
          members={family?.profiles}
        />
      )}
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

/**
 * 계정 탈퇴 확인. 누가 탈퇴하는지에 따라 글이 다르다(`withdrawalCase`).
 * 다른 구성원이 남은 오너에게는 탈퇴 버튼 대신 가족 관리로 가는 버튼을 낸다.
 * 성공하면 이 기기에서만 로그아웃하고 로그인 화면으로 보낸다. 로그인 화면이 「탈퇴했어요」 를 띄운다
 */
function WithdrawSheet({
  open,
  onClose,
  me,
  members,
}: {
  open: boolean;
  onClose: () => void;
  me: ProfileSummary | undefined;
  members: ProfileSummary[] | undefined;
}) {
  const router = useRouter();
  const signOut = useSignOut();
  const withdraw = useWithdraw();
  // 받아 둔 가족이 혼자여도 서버가 다른 구성원이 있다고 돌려보내면 오너 안내로 바꾼다
  const [familyNotEmpty, setFamilyNotEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = WITHDRAWAL_COPY[withdrawalCase({ me, members, familyNotEmpty })];

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setError(null);
    try {
      await withdraw.mutateAsync();
      // 로그아웃과 같은 차례. 먼저 떠나야 비운 `/me` 를 다시 받으려다 오류 화면이 비치지 않는다
      router.replace(WITHDRAWN_PATH);
      signOut();
    } catch (e) {
      if (e instanceof ApiError && e.code === "FAMILY_NOT_EMPTY") {
        setFamilyNotEmpty(true);
        return;
      }
      setError(errorMessage(e, "탈퇴하지 못했어요. 잠시 뒤에 다시 해 주세요."));
    }
  };

  return (
    <Sheet open={open} onClose={close} title={copy.title}>
      <div className="space-y-5">
        <div className="space-y-1.5">
          {copy.lines.map((line) => (
            <p key={line} className="text-body text-ink-soft">
              {line}
            </p>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-signal-deep text-sm font-semibold">
            {error}
          </p>
        )}

        {copy.canWithdraw ? (
          <div className="flex gap-2">
            <Button variant="outline" size="md" className="flex-1" onClick={close}>
              그대로 두기
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              loading={withdraw.isPending}
              onClick={() => void confirm()}
            >
              탈퇴하기
            </Button>
          </div>
        ) : (
          <Button
            size="block"
            onClick={() => {
              close();
              router.push("/parent/family");
            }}
          >
            가족 관리로 가기
          </Button>
        )}
      </div>
    </Sheet>
  );
}
