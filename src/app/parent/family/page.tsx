"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { PlainScreen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { CardHead } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { NavLink } from "@/components/ui/nav-link";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { Field } from "@/components/ui/field";
import { errorMessage } from "@/lib/errors";
import type { ProfileSummary } from "@/lib/api/types";
import { useCreateProfile, useFamilyProfiles } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { today } from "@/lib/today";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";
import { PhotoSheet } from "@/components/domain/photo-sheet";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { InviteSheet } from "@/components/domain/invite-sheet";

/** 가족 더하기. */
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
  const error = sessionError ?? familyError;
  const childProfileId = useRoleStore((s) => s.childProfileId);

  const [adding, setAdding] = useState(false);
  // 초대 시트 — 닫힘(undefined) · 이 자리로(id). 가족 대시보드와 같은 시트다
  const [inviting, setInviting] = useState<string | null | undefined>(undefined);

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
                onInvite={() => setInviting(p.profileId ?? null)}
              />
            ))}
          </ul>
          {/* 아이는 첫 시작과 같은 흐름으로(키 · 몸무게 · 운동 시간 · 사진) — 시트로 따로 받으면 반쪽 아이가 생긴다.
              보호자만 여기서 자리를 만들고 초대한다 */}
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
              onClick={() => setAdding(true)}
              className="press bg-sub flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold"
            >
              <Plus className="text-signal-strong size-4" aria-hidden />
              보호자 더하기
            </button>
          </div>
        </section>

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
              href={`/parent/sticker/${kid.profileId}`}
              art="icon/menu-cheer"
              title="칭찬 스티커 붙이기"
            />
          )}
        </ul>

        <AddMemberSheet open={adding} onClose={() => setAdding(false)} familyId={familyId ?? ""} />
        <InviteSheet
          open={inviting !== undefined}
          onClose={() => setInviting(undefined)}
          familyName={family?.familyName ?? "우리 가족"}
          members={profiles}
          initialId={inviting}
        />
      </Stage>
    </>
  );
}

function MemberRow({ profile, onInvite }: { profile: ProfileSummary; onInvite: () => void }) {
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
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-body font-bold">{profile.name}</p>
          <p className="text-faint mt-0.5 text-xs">
            {profile.ageGroup} · {profile.role === "PARENT" ? "부모" : "자녀"}
          </p>
        </div>

        {profile.hasAccount ? (
          <span className="text-done text-xs font-bold">연결됨</span>
        ) : (
          // 코드는 이 자리 하나에 맞는다 — 시트에서 만들고 복사 · 공유한다
          <Button size="md" variant="outline" onClick={onInvite}>
            초대하기
          </Button>
        )}
      </div>
    </li>
  );
}

/** 참여 방식을 한 줄로. 고르지 않았으면 고르라고 말한다 */
const SUPPORT_COPY: Record<string, string> = {
  CHEER_ONLY: "응원할게요",
  WEEKEND: "주말에는 같이",
  FULL: "매번 같이",
  none: "아직 안 골랐어요",
};

function AddMemberSheet({
  open,
  onClose,
  familyId,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
}) {
  const create = useCreateProfile(familyId);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  // 미리 켜 두지 않는다. 기본값이 여성이면 고르지 않은 아빠가 여성으로 저장된다
  const [sex, setSex] = useState<"M" | "F" | null>(null);
  // 아이는 「아이 등록하기」(첫 시작과 같은 흐름)로 — 여기서는 보호자 자리만. 아이 동의 칸이 없다
  const role = "PARENT" as const;
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim() !== "" && birthDate !== "" && sex != null;

  return (
    <Sheet open={open} onClose={onClose} title="보호자 더하기">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            if (!sex) return;
            await create.mutateAsync({ name: name.trim(), birthDate, sex, role });
            setName("");
            setBirthDate("");
            setSex(null);
            onClose();
          } catch (err) {
            setError(
              errorMessage(
                err,
                { CONSENT_REQUIRED: "보호자는 만 14세부터 더할 수 있어요." },
                "더하지 못했어요.",
              ),
            );
          }
        }}
      >
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            className="field"
          />
        </Field>

        <Field label="생년월일">
          <input
            type="date"
            value={birthDate}
            max={today()}
            onChange={(e) => setBirthDate(e.target.value)}
            className="field"
          />
        </Field>

        <Field label="성별" group>
          <div className="flex gap-2">
            {(
              [
                ["F", "여성"],
                ["M", "남성"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSex(value)}
                aria-pressed={sex === value}
                className={cn("chip press", sex === value && "chip-on")}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <p role="alert" className="text-signal-deep text-sm font-semibold">
            {error}
          </p>
        )}

        <Button type="submit" size="block" disabled={!valid} loading={create.isPending}>
          더하기
        </Button>
      </form>
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
