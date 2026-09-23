"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { PlainScreen } from "@/components/app-shell/screen";
import { Stage } from "@/components/app-shell/stage";
import { CardHead } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { Field } from "@/components/ui/field";
import { errorMessage } from "@/lib/errors";
import type { ProfileSummary } from "@/lib/api/types";
import { useCreateProfile, useFamilyProfiles, useOpenInvite } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { ageOf, today } from "@/lib/today";
import { cn } from "@/lib/utils";
import { useRoleStore } from "@/stores/role-store";
import { Initial } from "@/components/ui/initial";

/** 가족 더하기. */
export default function MembersPage() {
  const { profile, familyId, isPending: sessionPending } = useSession();
  const { data: family, isPending, error, refetch } = useFamilyProfiles(familyId);
  const childProfileId = useRoleStore((s) => s.childProfileId);

  const [adding, setAdding] = useState(false);

  if (sessionPending || isPending) return <MembersSkeleton />;

  // 못 불러온 것을 "아무도 없음" 으로 그리면 가족이 사라진 것처럼 보인다
  if (error) {
    return (
      <>
        <AppBar backHref="/parent" title="가족" />
        <PlainScreen className="pt-1">
          <ErrorState error={error} onRetry={() => void refetch()} />
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
      <AppBar backHref="/parent" title={family?.familyName ?? "가족"} />
      <Stage wide className="space-y-3">
        <section className="card">
          <CardHead title="구성원" meta={`${profiles.length}명`} />
          <ul className="divide-rows">
            {profiles.map((p) => (
              <MemberRow key={p.profileId} profile={p} />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="press bg-sub mt-2 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-bold"
          >
            <Plus className="text-signal-strong size-4" aria-hidden />
            가족 더하기
          </button>
        </section>

        {/* 부모 홈에서 내려온 것들. 가족에 관한 일은 여기 모인다 */}
        <ul className="card divide-rows py-1">
          <ListRow
            href="/settings/support-mode"
            art="icon/menu-support"
            title="얼마나 같이 할지"
            description={SUPPORT_COPY[mySupportMode ?? "none"]}
          />
          <ListRow
            href="/settings/schedule"
            art="icon/menu-schedule"
            title="운동할 수 있는 시간"
            description="적어 두면 AI 편성 · 직접 짜기가 그 날에 맞춘다"
          />
          {kid?.profileId && (
            <ListRow
              href={`/parent/sticker/${kid.profileId}`}
              art="icon/menu-cheer"
              title="칭찬 스티커 붙이기"
              description={`${kid.name}에게 오늘 한 장`}
            />
          )}
        </ul>

        <AddMemberSheet open={adding} onClose={() => setAdding(false)} familyId={familyId ?? ""} />
      </Stage>
    </>
  );
}

function MemberRow({ profile }: { profile: ProfileSummary }) {
  const invite = useOpenInvite();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="py-3.5">
      <div className="flex items-center gap-3">
        <Initial name={profile.name} tone={profile.role === "CHILD" ? "signal" : "mark"} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-bold">{profile.name}</p>
          <p className="text-faint mt-0.5 text-xs">
            {profile.ageGroup} · {profile.role === "PARENT" ? "부모" : "자녀"}
            {profile.measurable === false && " · 측정은 만 4세부터"}
          </p>
        </div>

        {profile.hasAccount ? (
          <span className="text-done text-xs font-bold">연결됨</span>
        ) : (
          <Button
            size="md"
            variant="outline"
            loading={invite.isPending}
            onClick={async () => {
              setError(null);
              try {
                const res = await invite.mutateAsync(profile.profileId ?? "");
                setCode(res.claimCode ?? null);
              } catch (e) {
                setError(
                  errorMessage(
                    e,
                    { ALREADY_CLAIMED: "이미 계정이 연결됐어요." },
                    "초대코드를 만들지 못했어요.",
                  ),
                );
              }
            }}
          >
            {code ? "코드 다시" : "초대하기"}
          </Button>
        )}
      </div>

      {code && (
        <div className="bg-sub mt-2.5 flex items-center justify-between rounded-xl px-4 py-3">
          <span className="board-num text-xl tracking-[0.2em]">{code}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="press text-signal-strong flex items-center gap-1 text-xs font-bold"
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {copied ? "복사했어요" : "복사"}
          </button>
        </div>
      )}
      {code && (
        <p className="text-faint text-caption mt-1">
          7일 안에 써야 해요. 새로 만들면 이전 코드는 바로 못 쓰게 돼요.
        </p>
      )}

      {error && (
        <p role="alert" className="text-signal-deep mt-2 text-xs font-semibold">
          {error}
        </p>
      )}
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
  const [role, setRole] = useState<"PARENT" | "CHILD">("CHILD");
  // 두 가지를 따로 받는다. 한 칸으로 묶으면 무엇에 동의했는지 흐려진다
  const [personal, setPersonal] = useState(false);
  const [health, setHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 만 14세 미만이면 보호자 동의가 있어야 저장된다
  const age = ageOf(birthDate);
  const needsConsent = age != null && age < 14;
  const valid =
    name.trim() !== "" &&
    birthDate !== "" &&
    sex != null &&
    (!needsConsent || (personal && health));

  return (
    <Sheet open={open} onClose={onClose} title="가족 더하기">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            if (!sex) return;
            await create.mutateAsync({
              name: name.trim(),
              birthDate,
              sex,
              role,
              ...(needsConsent
                ? { guardianConsent: { personalData: true, healthData: true } }
                : {}),
            });
            setName("");
            setBirthDate("");
            setSex(null);
            setPersonal(false);
            setHealth(false);
            onClose();
          } catch (err) {
            setError(
              errorMessage(
                err,
                { CONSENT_REQUIRED: "만 14세 미만은 보호자 동의가 있어야 해요." },
                "더하지 못했어요. 잠시 후 다시 시도해 주세요.",
              ),
            );
          }
        }}
      >
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="첫째"
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

        <Field label="역할" hint="한 번 정하면 바꿀 수 없어요" group>
          <div className="flex gap-2">
            {(
              [
                ["CHILD", "자녀"],
                ["PARENT", "부모"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                aria-pressed={role === value}
                className={cn("chip press", role === value && "chip-on")}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        {/* 서버가 동의를 자동으로 찍지 않는다. 보호자가 두 가지를 각각 직접 켠다 */}
        {needsConsent && (
          <div role="group" aria-label="보호자 동의" className="space-y-2">
            <p className="text-caption text-ink-soft">
              만 14세 미만이라 보호자 동의가 있어야 저장돼요. 나중에 설정에서 철회할 수 있어요.
            </p>
            {(
              [
                [
                  personal,
                  setPersonal,
                  "개인정보 처리에 동의해요",
                  "이름 · 생년월일을 또래 기준과 견주는 데만 써요",
                ],
                [
                  health,
                  setHealth,
                  "건강정보 처리에 동의해요",
                  "측정값과 운동 기록이 여기에 저장돼요",
                ],
              ] as const
            ).map(([on, set, title, note]) => (
              <label key={title} className="bg-sub flex items-start gap-3 rounded-2xl p-3.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => set(e.target.checked)}
                  className="accent-signal mt-0.5 size-4.5"
                />
                <span className="text-sm leading-relaxed">
                  <span className="block font-bold">{title}</span>
                  <span className="text-ink-soft mt-0.5 block text-xs">{note}</span>
                </span>
              </label>
            ))}
          </div>
        )}

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
      <AppBar backHref="/parent" title="가족" />
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
