"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { PlainScreen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { CardHead } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { NavLink } from "@/components/ui/nav-link";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtIcon } from "@/components/ui/art-icon";

import { errorMessage } from "@/lib/errors";
import type { PendingInvite, ProfileSummary } from "@/lib/api/types";
import {
  useCancelFamilyInvite,
  useCurrentMissions,
  useFamilyInvites,
  useFamilyProfiles,
  useRemoveMember,
} from "@/lib/api/queries";
import { missionsOn } from "@/lib/day";
import { canRemoveMember, removeMemberCopy } from "@/lib/family";
import { pendingInviteDetail, pendingInviteTitle } from "@/lib/invite";
import { useSession } from "@/lib/session";
import { today } from "@/lib/today";
import { usePhotoStore } from "@/stores/photo-store";
import { useRoleStore } from "@/stores/role-store";
import { PhotoSheet } from "@/components/domain/photo-sheet";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { InviteSheet } from "@/components/domain/invite-sheet";

/** 가족 관리 — 구성원, 아이 등록하기, 초대하기, 보낸 초대. */
export default function MembersPage() {
  const {
    profile,
    familyId,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
  // 꺼진 조회(가족을 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const { data: family, isLoading, error: familyError, refetch } = useFamilyProfiles(familyId);
  const error = sessionError ?? (family ? null : familyError);
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const { data: missions } = useCurrentMissions(familyId);

  // 초대 시트. 닫힘(undefined), 새로 초대(null), 이 자리로(id). 가족 대시보드와 같은 시트다
  const [inviting, setInviting] = useState<string | null | undefined>(undefined);
  // 보낸 초대를 다시 볼 때 — 그 코드를 연다. 시트가 내려가는 동안에도 글이 남도록 닫을 때 비우지 않는다
  const [reopened, setReopened] = useState<PendingInvite | null>(null);
  // 내보내기 확인 시트. 시트가 닫히며 내려가는 동안에도 글이 남도록, 누구를 내보낼지는 state 에 따로 들고 있는다
  const [removing, setRemoving] = useState<ProfileSummary | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  if (sessionPending || isLoading) return <MembersSkeleton />;

  // 못 불러온 것을 "아무도 없음" 으로 그리면 가족이 사라진 것처럼 보인다
  if (error) {
    return (
      <>
        <AppBar backHref="/parent/dashboard" title="가족" />
        <PlainScreen className="pt-1">
          <ErrorState error={error} onRetry={() => void (sessionError ? refetchMe() : refetch())} />
        </PlainScreen>
      </>
    );
  }

  const profiles = family?.profiles ?? [];
  // 스티커는 지금 보고 있는 아이에게. 고른 적이 없으면 첫째
  const kid =
    profiles.find((p) => p.profileId === childProfileId) ??
    profiles.find((p) => p.role === "CHILD");
  const mySupportMode = profile?.supportMode ?? undefined;
  // 내가 오너인지는 가족 목록의 내 줄로 본다. 아직 없으면 `/me` 의 내 프로필로
  const me = profiles.find((p) => p.profileId === profile?.profileId) ?? profile;
  // 스티커는 오늘 한 운동에 붙인다 — 직접 적은 기록이 먼저(스티커가 곧 확인이다). 한 게 없으면 그냥 칭찬이다
  const todays = missionsOn(missions?.missions, kid?.profileId, today());
  const mineIn = (m: (typeof todays)[number]) =>
    m.participants?.find((p) => p.profileId === kid?.profileId);
  const cheerFor =
    todays.find((m) => mineIn(m)?.needsGuardianCheck) ?? todays.find((m) => mineIn(m)?.completed);

  return (
    <>
      <AppBar backHref="/parent/dashboard" title={family?.familyName ?? "가족"} />
      <Stage wide className="space-y-3">
        <section className="card">
          <CardHead title="구성원" meta={`${profiles.length}명`} />
          <ul className="divide-rows">
            {profiles.map((p) => (
              <MemberRow
                key={p.profileId}
                profile={p}
                onInvite={() => {
                  setReopened(null);
                  setInviting(p.profileId ?? null);
                }}
                onRemove={
                  canRemoveMember(me, p)
                    ? () => {
                        setRemoving(p);
                        setRemoveOpen(true);
                      }
                    : undefined
                }
              />
            ))}
          </ul>
          {/* 구성원이 나 하나다. 아래 두 버튼으로 가족을 채울 수 있다고 키움이가 먼저 말한다 */}
          {profiles.length === 1 && (
            <EmptyState
              size="card"
              // scene/kiumi-invite 그림이 오면 이 줄을 invite 로 바꾼다
              scene="hello"
              title="아직 함께하는 가족이 없어요"
              description="아이를 등록하거나 가족을 초대해 보세요"
            />
          )}
          {/* 폰 없는 아이는 보호자가 정보를 넣어 등록한다(첫 시작과 같은 흐름, 키와 몸무게, 운동 시간까지).
              폰이 있는 사람은 보호자든 아이든 초대 코드를 먼저 만들고, 받은 사람이 자기 정보를 넣는다(10번) */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NavLink
              href="/start/child"
              className="press bg-sub flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold"
            >
              <Plus className="text-signal-strong size-4" aria-hidden />
              아이 등록하기
            </NavLink>
            <button
              type="button"
              onClick={() => {
                setReopened(null);
                setInviting(null);
              }}
              className="press bg-sub flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold"
            >
              <ArtIcon name="icon/menu-invite" className="size-5" />
              초대하기
            </button>
          </div>
        </section>

        <PendingInvites
          familyId={familyId}
          onOpen={(invite) => {
            setReopened(invite);
            setInviting(null);
          }}
        />

        {/* 부모 홈에서 내려온 것들. 가족에 관한 일은 여기 모인다 */}
        <ul className="card divide-rows py-1">
          <ListRow
            href="/settings/support-mode"
            art="icon/menu-support"
            title="얼마나 같이 할지"
            description={SUPPORT_COPY[mySupportMode ?? "none"]}
          />
          <ListRow href="/settings/schedule" art="icon/menu-schedule" title="운동할 수 있는 시간" />
          {kid?.profileId && (
            <ListRow
              href={`/parent/sticker/${kid.profileId}${cheerFor?.missionId ? `?missionId=${encodeURIComponent(cheerFor.missionId)}` : ""}`}
              art="icon/menu-cheer"
              title="칭찬 스티커 붙이기"
            />
          )}
        </ul>

        <InviteSheet
          open={inviting !== undefined}
          onClose={() => setInviting(undefined)}
          familyName={family?.familyName ?? "우리 가족"}
          members={profiles}
          initialId={inviting}
          shown={reopened}
        />
        <RemoveMemberSheet
          open={removeOpen}
          onClose={() => setRemoveOpen(false)}
          member={removing}
          familyId={familyId ?? ""}
        />
      </Stage>
    </>
  );
}

function MemberRow({
  profile,
  onInvite,
  onRemove,
}: {
  profile: ProfileSummary;
  onInvite: () => void;
  /** 오너가 다른 구성원 줄에서만 받는다. 없으면 내보내기를 내지 않는다 */
  onRemove?: () => void;
}) {
  const [photoOpen, setPhotoOpen] = useState(false);
  // 동의를 거둔 아이는 사진도 올리지 않는다
  const canPhoto = !(profile.role === "CHILD" && profile.consentRequired && !profile.consentGiven);
  const avatar = (
    <ProfileAvatar
      profileId={profile.profileId}
      name={profile.name}
      tone={profile.role === "CHILD" ? "signal" : "mark"}
    />
  );
  return (
    <li className="py-3.5">
      <div className="flex items-center gap-3">
        {/* 누르면 사진 바꾸기 — 계정 없는 아이 사진도 부모가 붙인다 */}
        {canPhoto ? (
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label={`${profile.name ?? ""} 사진 바꾸기`}
            className="press grid size-11 shrink-0 place-items-center rounded-full"
          >
            {avatar}
          </button>
        ) : (
          <span className="grid size-11 shrink-0 place-items-center">{avatar}</span>
        )}
        {canPhoto && profile.profileId && (
          <PhotoSheet
            open={photoOpen}
            onClose={() => setPhotoOpen(false)}
            profileId={profile.profileId}
            name={profile.name ?? ""}
            tone={profile.role === "CHILD" ? "signal" : "mark"}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-body font-bold">{profile.name}</p>
          <p className="text-faint mt-0.5 text-xs">
            {profile.ageGroup}, {profile.role === "PARENT" ? "부모" : "자녀"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {profile.hasAccount ? (
            <span className="text-done text-xs font-bold">연결됨</span>
          ) : (
            // 코드는 이 자리 하나에 맞는다 — 시트에서 만들고 복사 · 공유한다
            <Button
              size="md"
              variant="outline"
              onClick={onInvite}
              aria-label={`${profile.name ?? "이 자리"} 초대하기`}
            >
              초대하기
            </Button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`${profile.name ?? ""} 내보내기`}
              className="press text-signal-deep text-caption min-h-11 px-2 font-bold"
            >
              내보내기
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * 구성원 내보내기 확인. 내보내면 그 사람의 프로필과 기록이 지워지고 되돌릴 수 없다.
 * 계정이 있는 사람이면 계정은 남고 우리 가족에서만 빠진다
 */
function RemoveMemberSheet({
  open,
  onClose,
  member,
  familyId,
}: {
  open: boolean;
  onClose: () => void;
  member: ProfileSummary | null;
  familyId: string;
}) {
  const remove = useRemoveMember(familyId);
  const removePhoto = usePhotoStore((s) => s.remove);
  const [error, setError] = useState<string | null>(null);
  const copy = removeMemberCopy(member ?? {});

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    const profileId = member?.profileId;
    if (!profileId) return;
    setError(null);
    try {
      await remove.mutateAsync(profileId);
      // 이 기기에 둔 그 사람 사진을 지우고, 보고 있던 아이였으면 고른 아이를 비운다(첫째로 돌아간다)
      removePhoto(profileId);
      if (useRoleStore.getState().childProfileId === profileId) {
        useRoleStore.getState().setChild(null);
      }
      close();
    } catch (e) {
      setError(
        errorMessage(
          e,
          {
            NOT_FAMILY_OWNER: "가족을 만든 사람만 내보낼 수 있어요.",
            NOT_SAME_FAMILY: "다른 가족의 사람은 내보낼 수 없어요.",
            FAMILY_NOT_FOUND: "가족을 찾지 못했어요. 화면을 새로 불러 주세요.",
            CANNOT_REMOVE_SELF: "나는 내보낼 수 없어요. 설정에서 탈퇴할 수 있어요.",
            PROFILE_NOT_FOUND: "이미 우리 가족에 없는 사람이에요.",
          },
          "내보내지 못했어요. 잠시 뒤에 다시 해 주세요.",
        ),
      );
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

        <div className="flex gap-2">
          <Button variant="outline" size="md" className="flex-1" onClick={close}>
            그대로 두기
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1"
            loading={remove.isPending}
            onClick={() => void confirm()}
          >
            내보내기
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/** 참여 방식을 한 줄로. 고르지 않았으면 고르라고 말한다 */
const SUPPORT_COPY: Record<string, string> = {
  CHEER_ONLY: "응원할게요",
  WEEKEND: "주말에는 같이",
  FULL: "매번 같이",
  none: "아직 안 골랐어요",
};

/**
 * 보낸 초대 — 아직 쓰지 않았고 기한이 남은 가족 초대. 누르면 그 코드를 다시 열어 복사하거나 보낸다.
 * 잘못 보냈으면 취소한다. 하나도 없으면 묶음을 그리지 않는다
 */
function PendingInvites({
  familyId,
  onOpen,
}: {
  familyId: string | undefined;
  onOpen: (invite: PendingInvite) => void;
}) {
  const { data, error, refetch, isRefetching } = useFamilyInvites(familyId);
  // 취소 확인 시트. 내려가는 동안에도 글이 남도록 무엇을 취소할지는 따로 든다
  const [cancelling, setCancelling] = useState<PendingInvite | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const invites = data?.invites ?? [];

  if (error && !data) {
    return (
      <section className="card flex items-center justify-between gap-3">
        <p className="text-body text-ink-soft">보낸 초대를 불러오지 못했어요</p>
        <Button size="md" variant="outline" loading={isRefetching} onClick={() => void refetch()}>
          다시 불러오기
        </Button>
      </section>
    );
  }
  if (invites.length === 0) return null;

  return (
    <section className="card">
      <CardHead title="보낸 초대" meta={`${invites.length}개`} />
      <ul className="divide-rows">
        {invites.map((invite) => (
          <li key={invite.code} className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => onOpen(invite)}
              aria-label={`${pendingInviteTitle(invite)} 코드 ${invite.code ?? ""} 보기`}
              className="press flex min-h-12 min-w-0 flex-1 flex-col justify-center text-left"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-body font-bold">{pendingInviteTitle(invite)}</span>
                <span className="board-num text-ink-soft text-sm tracking-[0.15em]">
                  {invite.code}
                </span>
              </span>
              <span className="text-faint mt-0.5 text-xs">{pendingInviteDetail(invite)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCancelling(invite);
                setCancelOpen(true);
              }}
              aria-label={`${pendingInviteTitle(invite)} 취소`}
              className="press text-signal-deep text-caption min-h-11 min-w-11 shrink-0 px-2 font-bold"
            >
              취소
            </button>
          </li>
        ))}
      </ul>
      <CancelInviteSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        invite={cancelling}
        familyId={familyId}
      />
    </section>
  );
}

/** 초대 취소 확인. 취소하면 그 코드로는 들어올 수 없다. 이미 보냈으면 새 코드를 다시 보내야 한다 */
function CancelInviteSheet({
  open,
  onClose,
  invite,
  familyId,
}: {
  open: boolean;
  onClose: () => void;
  invite: PendingInvite | null;
  familyId: string | undefined;
}) {
  const cancel = useCancelFamilyInvite(familyId);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!invite?.code) return;
    setError(null);
    try {
      await cancel.mutateAsync(invite.code);
      close();
    } catch (e) {
      setError(
        errorMessage(
          e,
          { INVITE_NOT_FOUND: "이미 사용됐거나 취소된 초대예요." },
          "초대를 취소하지 못했어요. 잠시 뒤에 다시 해 주세요.",
        ),
      );
    }
  };

  return (
    <Sheet open={open} onClose={close} title="초대를 취소할까요">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-body text-ink-soft">
            {invite ? `${pendingInviteTitle(invite)} 코드 ${invite.code ?? ""}` : ""}
          </p>
          <p className="text-body text-ink-soft">취소하면 이 코드로는 가족에 참여할 수 없어요</p>
        </div>

        {error && (
          <p role="alert" className="text-signal-deep text-sm font-semibold">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="md" className="flex-1" onClick={close}>
            그대로 두기
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1"
            loading={cancel.isPending}
            onClick={() => void confirm()}
          >
            초대 취소
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function MembersSkeleton() {
  return (
    <>
      <AppBar backHref="/parent/dashboard" title="가족" />
      <PlainScreen className="space-y-6 pt-1">
        <Skeleton className="h-9 w-40" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </PlainScreen>
    </>
  );
}
