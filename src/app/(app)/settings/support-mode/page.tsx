"use client";

import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Illustration } from "@/components/ui/illustration";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import type { SupportMode } from "@/lib/api/types";
import { useUpdateSupportMode } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/** 참여 방식. */
const MODES: { value: SupportMode; title: string; description: string; art: string }[] = [
  {
    value: "CHEER_ONLY",
    title: "응원할게요",
    description: "같이 뛰기는 어려워요. 미션 편성에서 빠지고 응원을 보내는 역할을 맡아요.",
    art: "item/item-whistle",
  },
  {
    value: "WEEKEND",
    title: "주말에는 같이",
    description: "평일은 어려워도 주말엔 함께해요. 코치가 주말 미션에 같이 넣어 줘요.",
    art: "item/item-shoes",
  },
  {
    value: "FULL",
    title: "매번 같이",
    description: "가능한 한 함께해요. 코치가 모든 미션에 동반자로 넣어 줘요.",
    art: "item/item-medal",
  },
];

function SupportModePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, familyId, isPending } = useSession();
  const update = useUpdateSupportMode(profile?.profileId ?? "", familyId ?? "");
  const [error, setError] = useState<string | null>(null);

  // 초대를 받아 막 들어온 길이면 여기가 끝이 아니다. 고르고 나서 갈 곳이 있어야 한다
  const joining = params.get("from") === "claim";

  if (isPending) return <SupportSkeleton />;

  // 자녀에게는 없는 설정이다. 서버도 422 로 막는다
  if (profile?.role === "CHILD") {
    return (
      <>
        <PageHeader title="참여 방식" back />
        <Screen>
          <EmptyState
            scene="no-mission"
            title="이 설정은 보호자만 있어요"
            description="참여 방식은 보호자가 얼마나 같이 뛸지를 정하는 설정이에요."
          />
        </Screen>
      </>
    );
  }

  const current = profile?.supportMode ?? null;

  return (
    <>
      <PageHeader title="참여 방식" back={!joining} />

      <Screen className="space-y-5">
        <p className="text-ink-soft text-sm leading-relaxed">
          얼마나 같이 뛸 수 있는지 골라 주세요. 다음 주 미션 편성이 이 선택을 따라가요. 바쁠 땐
          응원만으로도 충분해요.
        </p>

        <ul className="divide-rows">
          {MODES.map((mode) => {
            const on = current === mode.value;
            return (
              <li key={mode.value}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={update.isPending}
                  onClick={async () => {
                    setError(null);
                    try {
                      await update.mutateAsync(mode.value);
                    } catch (e) {
                      setError(
                        errorMessage(
                          e,
                          { NOT_APPLICABLE: "자녀 프로필에는 없는 설정이에요." },
                          "바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
                        ),
                      );
                    }
                  }}
                  className="press flex w-full items-start gap-3 py-4 text-left"
                >
                  <Illustration name={mode.art} size={44} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="text-body block font-bold">{mode.title}</span>
                    <span className="text-ink-soft mt-0.5 block text-sm leading-relaxed">
                      {mode.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                      on ? "bg-signal border-signal text-white" : "border-line",
                    )}
                    aria-hidden
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {error && (
          <p
            role="alert"
            className="bg-signal-soft text-signal-deep rounded-xl px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}

        {joining && (
          <Button size="block" disabled={!current} onClick={() => router.replace("/start")}>
            {current ? "다 골랐어요" : "하나 골라 주세요"}
          </Button>
        )}

        {current === "CHEER_ONLY" && (
          <p className="text-faint text-caption leading-relaxed">
            응원 역할일 때도 미션 참여자 명단에는 남아요. 가족이 함께한 기록으로 남습니다.
          </p>
        )}
      </Screen>
    </>
  );
}

function SupportSkeleton() {
  return (
    <>
      <PageHeader title="참여 방식" back />
      <Screen className="space-y-5">
        <Skeleton className="h-10 w-full" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </Screen>
    </>
  );
}

export default function SupportModePage() {
  return (
    <ParentOnly>
      <Suspense fallback={<SupportSkeleton />}>
        <SupportModePageContent />
      </Suspense>
    </ParentOnly>
  );
}
