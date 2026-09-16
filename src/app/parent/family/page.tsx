"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { PlainScreen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/illustration";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import type { ProfileSummary } from "@/lib/api/types";
import { useCreateProfile, useFamilyProfiles, useOpenInvite } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { avatarFor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * 가족 더하기.
 *
 * 프로필과 계정은 다르다. 여기서 만드는 건 **프로필**이고, 그 사람이 자기 폰에서
 * 쓰려면 **초대코드**로 자기 계정을 붙여야 한다. 아이가 폰이 없어도 프로필만으로
 * 측정과 미션이 굴러간다 — 그래서 초대는 선택이다.
 *
 * 만 14세 미만은 보호자 동의를 여기서 받는다. 서버가 자동으로 찍지 않는다.
 */
export default function MembersPage() {
  const router = useRouter();
  const { familyId, isPending: sessionPending } = useSession();
  const { data: family, isPending } = useFamilyProfiles(familyId);

  const [adding, setAdding] = useState(false);

  if (sessionPending || isPending) return <MembersSkeleton />;

  const profiles = family?.profiles ?? [];

  return (
    <>
      <AppBar backHref="/parent" title="가족" />
      <PlainScreen className="space-y-6 pt-1">
        <div>
          <h1 className="page-title">{family?.familyName ?? "우리집"}</h1>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            같이 할 가족을 더해요. 아이가 폰이 없어도 괜찮아요 — 프로필만 있으면 측정과 미션이
            굴러가요.
          </p>
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

        <Button size="block" onClick={() => router.replace("/parent")}>
          {profiles.length > 1 ? "시작하기" : "나중에 더하고 시작하기"}
        </Button>

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
          <p className="text-[0.95rem] font-bold">{profile.name}</p>
          <p className="text-faint mt-0.5 text-xs">
            {profile.ageGroup} · {profile.role === "PARENT" ? "부모" : "자녀"}
            {profile.measurable === false && " · 측정은 만 4세부터"}
          </p>
        </div>

        {profile.hasAccount ? (
          <span className="text-done text-xs font-bold">연결됨</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            loading={invite.isPending}
            onClick={async () => {
              setError(null);
              try {
                const res = await invite.mutateAsync(profile.profileId ?? "");
                setCode(res.claimCode ?? null);
              } catch (e) {
                setError(
                  e instanceof ApiError && e.code === "ALREADY_CLAIMED"
                    ? "이미 계정이 연결됐어요."
                    : e instanceof ApiError
                      ? e.userMessage
                      : "초대코드를 만들지 못했어요.",
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
        <p className="text-faint mt-1 text-[0.7rem]">
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

  const today = new Date().toISOString().slice(0, 10);
  // 만 14세 미만이면 보호자 동의가 있어야 저장된다
  const age = birthDate ? new Date().getFullYear() - new Date(birthDate).getFullYear() : null;
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
              err instanceof ApiError && err.code === "CONSENT_REQUIRED"
                ? "만 14세 미만은 보호자 동의가 있어야 해요."
                : err instanceof ApiError
                  ? err.userMessage
                  : "더하지 못했어요. 잠시 후 다시 시도해 주세요.",
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
            max={today}
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
