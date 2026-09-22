"use client";

import { Check, ChevronRight, Copy, Plus } from "lucide-react";
import { Illustration } from "@/components/ui/illustration";
import Link from "next/link";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { PlainScreen } from "@/components/app-shell/screen";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/illustration";
import { Field } from "@/components/ui/field";
import { errorMessage } from "@/lib/errors";
import type { ProfileSummary } from "@/lib/api/types";
import { useCreateProfile, useFamilyProfiles, useOpenInvite } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { avatarFor } from "@/lib/avatar";
import { ageOf, today } from "@/lib/today";
import { cn } from "@/lib/utils";

/** 가족 더하기. */
export default function MembersPage() {
  const { profile, familyId, isPending: sessionPending } = useSession();
  const { data: family, isPending, error, refetch } = useFamilyProfiles(familyId);

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
  const mySupportMode = profile?.supportMode ?? undefined;

  return (
    <>
      <AppBar backHref="/parent" title="가족" />
      <PlainScreen className="space-y-6 pt-1">
        <div>
          <h2 className="page-title">{family?.familyName ?? "우리집"}</h2>
        </div>

        <ul className="divide-rows">
          {profiles.map((p) => (
            <MemberRow key={p.profileId} profile={p} />
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="press border-line flex w-full items-center gap-2 rounded-xl border border-dashed px-4 py-4"
        >
          <Plus className="text-signal size-4" aria-hidden />
          <span className="text-sm font-bold">가족 더하기</span>
        </button>

        {/* 부모 홈에서 내려온 것들. 가족에 관한 일은 여기 모인다 */}
        <ul className="divide-rows">
          <FamilyLink
            href="/settings/support-mode"
            art="item/item-shoes"
            title="얼마나 같이 뛸지"
            description={SUPPORT_COPY[mySupportMode ?? "none"]}
          />
          <FamilyLink
            href="/family/report"
            art="item/item-calendar"
            title="이번 주 우리 가족"
            description="누가 얼마나 움직였는지"
          />
          <FamilyLink
            href="/family/cheer"
            art="scene/scene-no-cheer"
            fallback="item/item-whistle"
            title="응원 보내기"
            description="가족끼리 한마디"
          />
        </ul>

        <AddMemberSheet open={adding} onClose={() => setAdding(false)} familyId={familyId ?? ""} />
      </PlainScreen>
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
        <Avatar parts={avatarFor(profile)} size={44} />
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
            className="press text-signal flex items-center gap-1 text-xs font-bold"
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

/** 가족에 관한 일로 들어가는 줄. */
function FamilyLink({
  href,
  art,
  fallback,
  title,
  description,
}: {
  href: string;
  art: string;
  fallback?: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link href={href} className="press flex items-center gap-3 py-3.5">
        <Illustration name={art} fallback={fallback} size={36} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="text-body block font-bold">{title}</span>
          <span className="text-ink-soft text-caption block leading-relaxed">{description}</span>
        </span>
        <ChevronRight className="text-faint size-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}

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
  const [sex, setSex] = useState<"M" | "F">("F");
  const [role, setRole] = useState<"PARENT" | "CHILD">("CHILD");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 만 14세 미만이면 보호자 동의가 있어야 저장된다
  const age = ageOf(birthDate);
  const needsConsent = age != null && age < 14;
  const valid = name.trim() !== "" && birthDate !== "" && (!needsConsent || consent);

  return (
    <Sheet open={open} onClose={onClose} title="가족 더하기">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
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
            setConsent(false);
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

        <Field label="성별">
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

        <Field label="역할" hint="한 번 정하면 바꿀 수 없어요">
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

        {/* 서버가 동의를 자동으로 찍지 않는다. 보호자가 직접 켠다 */}
        {needsConsent && (
          <label className="border-line flex items-start gap-3 rounded-xl border p-3.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="accent-signal mt-0.5 size-4.5"
            />
            <span className="text-sm leading-relaxed">
              <span className="block font-bold">보호자 동의</span>
              <span className="text-ink-soft mt-0.5 block">
                만 14세 미만이라 개인정보와 건강정보 저장에 보호자 동의가 필요해요. 나중에 설정에서
                철회할 수 있어요.
              </span>
            </span>
          </label>
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
