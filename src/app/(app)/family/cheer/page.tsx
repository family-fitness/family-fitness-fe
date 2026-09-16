"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/illustration";
import { avatarFor } from "@/lib/avatar";
import { errorMessage } from "@/lib/errors";
import { useFamilyProfiles, useSendCheer } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn, withJosa } from "@/lib/utils";

/** 응원 보내기. */
const PRESETS = [
  "오늘도 잘했어!",
  "같이 해서 좋았어",
  "내일도 화이팅",
  "네가 자랑스러워",
  "조금만 더 힘내!",
  "푹 쉬어",
];

export default function CheerPage() {
  const { profile, familyId, isPending: sessionPending } = useSession();
  const { data: family, isLoading: familyLoading } = useFamilyProfiles(familyId);
  const send = useSendCheer(familyId ?? "");

  const [toProfileId, setToProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>(PRESETS[0]);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sessionPending || familyLoading) return <CheerSkeleton />;

  // 자기 자신에게는 보낼 수 없다. 서버도 422 로 막는다
  const others = (family?.profiles ?? []).filter((p) => p.profileId !== profile?.profileId);
  const target = others.find((p) => p.profileId === toProfileId) ?? others[0];

  if (others.length === 0) {
    return (
      <>
        <PageHeader title="응원 보내기" back />
        <Screen>
          <EmptyState
            scene="no-cheer"
            title="아직 함께하는 가족이 없어요"
            description="가족을 초대하면 서로 응원을 보낼 수 있어요."
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <PageHeader title="응원 보내기" back />

      <Screen className="space-y-7">
        <section>
          <div className="section-head">
            <h2>누구에게</h2>
          </div>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {others.map((p) => {
              const on = p.profileId === target?.profileId;
              return (
                <li key={p.profileId}>
                  <button
                    type="button"
                    onClick={() => {
                      setToProfileId(p.profileId ?? null);
                      setSentTo(null);
                    }}
                    aria-pressed={on}
                    className={cn(
                      "press flex w-20 flex-col items-center gap-1 rounded-xl border p-2",
                      on ? "border-signal bg-signal-soft" : "border-line",
                    )}
                  >
                    <Avatar parts={avatarFor(p)} size={52} />
                    <span className="text-caption truncate font-bold">{p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <div className="section-head">
            <h2>무슨 말을</h2>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {PRESETS.map((text) => (
              <li key={text}>
                <button
                  type="button"
                  onClick={() => {
                    setMessage(text);
                    setSentTo(null);
                  }}
                  aria-pressed={message === text}
                  className={cn(
                    "press w-full rounded-xl border px-3 py-3 text-sm font-bold",
                    message === text
                      ? "border-signal bg-signal-soft text-signal-deep"
                      : "border-line",
                  )}
                >
                  {text}
                </button>
              </li>
            ))}
          </ul>

          <input
            type="text"
            value={PRESETS.includes(message) ? "" : message}
            onChange={(e) => {
              setMessage(e.target.value.slice(0, 100));
              setSentTo(null);
            }}
            placeholder="직접 쓰기"
            aria-label="직접 쓴 응원"
            className="border-line focus:border-signal placeholder:text-faint text-body mt-2 h-12 w-full rounded-xl border bg-transparent px-4 focus:outline-none"
          />
        </section>

        {sentTo && (
          <p
            role="status"
            className="bg-done-soft text-done flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
          >
            <Check className="size-4" strokeWidth={3} aria-hidden />
            {withJosa(sentTo, "이가")} 응원을 받았어요
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}

        <Button
          size="block"
          disabled={!message.trim() || !target}
          loading={send.isPending}
          onClick={async () => {
            setError(null);
            try {
              await send.mutateAsync({
                fromProfileId: profile?.profileId ?? "",
                toProfileId: target?.profileId ?? "",
                message: message.trim(),
              });
              setSentTo(target?.name ?? "");
            } catch (e) {
              setError(cheerMessage(e));
            }
          }}
        >
          {target ? `${target.name}에게 보내기` : "보내기"}
        </Button>
      </Screen>
    </>
  );
}

const cheerMessage = (error: unknown) =>
  errorMessage(
    error,
    {
      SELF_CHEER: "자기 자신에게는 보낼 수 없어요.",
      NOT_FAMILY_MEMBER: "같은 가족에게만 보낼 수 있어요.",
      TOO_MANY: "조금 쉬었다 보내 주세요. 같은 사람에게는 1분에 다섯 번까지예요.",
    },
    "보내지 못했어요. 잠시 후 다시 시도해 주세요.",
  );

function CheerSkeleton() {
  return (
    <>
      <PageHeader title="응원 보내기" back />
      <Screen className="space-y-7">
        <div className="flex gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="size-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </Screen>
    </>
  );
}
