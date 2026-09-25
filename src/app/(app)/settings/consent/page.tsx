"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { errorMessage } from "@/lib/errors";
import type { ProfileSummary } from "@/lib/api/types";
import { useFamilyProfiles, useUpdateConsent } from "@/lib/api/queries";
import { usePhotoStore } from "@/stores/photo-store";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/domain/profile-avatar";

/** 보호자 동의 관리. */
function ConsentPageContent() {
  const { familyId, isPending: sessionPending, error: sessionError } = useSession();
  const {
    data: family,
    isLoading: familyLoading,
    error: familyError,
    refetch,
    isRefetching,
  } = useFamilyProfiles(familyId);

  // 부모 화면(ParentOnly)이라 자녀는 여기까지 오지 않는다
  if (sessionPending || familyLoading) return <ConsentSkeleton />;

  // 못 받은 것을 「동의가 필요한 가족이 없어요」 로 그리지 않는다
  const failure = sessionError ?? familyError;
  if (failure) {
    return (
      <>
        <PageHeader title="보호자 동의" back />
        <Screen>
          <ErrorState error={failure} onRetry={() => void refetch()} retrying={isRefetching} />
        </Screen>
      </>
    );
  }

  const needConsent = (family?.profiles ?? []).filter((p) => p.consentRequired);

  return (
    <>
      <PageHeader title="보호자 동의" back />

      <Screen className="space-y-6">
        {needConsent.length === 0 ? (
          <EmptyState scene="waiting" title="동의가 필요한 가족이 없어요" />
        ) : (
          <ul className="divide-rows">
            {needConsent.map((child) => (
              <ConsentRow key={child.profileId} child={child} familyId={familyId ?? ""} />
            ))}
          </ul>
        )}
      </Screen>
    </>
  );
}

function ConsentRow({ child, familyId }: { child: ProfileSummary; familyId: string }) {
  const update = useUpdateConsent(child.profileId ?? "", familyId);
  const removePhoto = usePhotoStore((s) => s.remove);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const given = child.consentGiven ?? false;

  const apply = async (personalData: boolean, healthData: boolean) => {
    setError(null);
    try {
      await update.mutateAsync({ personalData, healthData });
      // 동의를 거두면 이 기기에 둔 아이 사진도 지운다 — 건강정보와 함께 거둔 것이다
      if (!personalData && child.profileId) removePhoto(child.profileId);
      setConfirming(false);
    } catch (e) {
      setError(
        errorMessage(
          e,
          { NOT_A_PARENT: "보호자 계정에서만 바꿀 수 있어요." },
          "바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      );
    }
  };

  return (
    <li className="py-4">
      <div className="flex items-center gap-3">
        <ProfileAvatar profileId={child.profileId} name={child.name} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-bold">{child.name}</p>
          <p className={cn("mt-0.5 text-xs font-semibold", given ? "text-done" : "text-ink-soft")}>
            {given ? "동의함" : "동의 없음"}
          </p>
        </div>

        <Button
          size="md"
          variant={given ? "danger" : "primary"}
          loading={update.isPending}
          onClick={() => (given ? setConfirming(true) : apply(true, true))}
        >
          {given ? "철회" : "동의하기"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-signal-deep mt-2 text-xs font-semibold">
          {error}
        </p>
      )}

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`${child.name}의 동의를 철회할까요`}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setConfirming(false)}
            >
              그대로 두기
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              loading={update.isPending}
              onClick={() => apply(false, false)}
            >
              철회하기
            </Button>
          </div>
        </div>
      </Sheet>
    </li>
  );
}

function ConsentSkeleton() {
  return (
    <>
      <PageHeader title="보호자 동의" back />
      <Screen className="space-y-6">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        ))}
      </Screen>
    </>
  );
}

export default function ConsentPage() {
  return (
    <ParentOnly>
      <ConsentPageContent />
    </ParentOnly>
  );
}
