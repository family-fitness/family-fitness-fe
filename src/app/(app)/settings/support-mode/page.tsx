"use client";

import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/errors";
import type { SupportMode } from "@/lib/api/types";
import { useUpdateSupportMode } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ArtIcon } from "@/components/ui/art-icon";

/** 참여 방식 — 셋 중 하나. 이름과 그림만 둔다(풀이 줄을 달지 않는다) */
const MODES: {
  value: SupportMode;
  title: string;
  /** 그림 이름. 오기 전에는 자리만 비어 있다 */
  art: string;
}[] = [
  {
    value: "CHEER_ONLY",
    title: "응원할게요",
    art: "icon/mode-cheer",
  },
  {
    value: "WEEKEND",
    title: "주말에는 같이",
    art: "icon/mode-weekend",
  },
  {
    value: "FULL",
    title: "매번 같이",
    art: "icon/mode-full",
  },
];

function SupportModePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { profile, familyId, isPending, error: sessionError, refetch } = useSession();
  const update = useUpdateSupportMode(profile?.profileId ?? "", familyId ?? "");
  const [error, setError] = useState<string | null>(null);

  /*
    초대를 받아 막 들어온 길이면 여기가 끝이 아니다 — 고르고 나서 갈 곳이 있어야 하고,
    뒤로 가기를 주면 안 된다. 가입 중인 길은 첫 시작의 한 칸으로 따로 묻는다.
  */
  const joining = params.get("from") === "claim";

  // 자녀에게는 없는 설정이다 — 부모 화면(ParentOnly)이라 자녀는 여기까지 오지 않는다
  if (isPending) return <SupportSkeleton />;
  // 누구의 참여 방식인지 못 받으면 셋 다 안 고른 채로 그리지 않는다 — 누르면 엉뚱한 곳에 저장하려 했다
  if (sessionError) {
    return (
      <>
        <PageHeader title="참여 방식" back={!joining} />
        <Screen>
          <ErrorState error={sessionError} onRetry={() => void refetch()} />
        </Screen>
      </>
    );
  }

  const current = profile?.supportMode ?? null;

  return (
    <>
      <PageHeader title="참여 방식" back={!joining} />

      <Screen className="space-y-5">
        <ul className="space-y-2.5">
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
                  className={cn(
                    "press card flex w-full items-start gap-3 text-left",
                    on && "ring-signal ring-2",
                  )}
                >
                  <ArtIcon name={mode.art} className="size-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="text-body block font-bold">{mode.title}</span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                      on ? "bg-signal-strong border-signal-strong text-white" : "border-line",
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
          <p role="alert" className="text-signal-deep text-center text-sm font-semibold">
            {error}
          </p>
        )}

        {joining && (
          <Button size="block" disabled={!current} onClick={() => router.replace("/start")}>
            다 골랐어요
          </Button>
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
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-4 w-32" />
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
