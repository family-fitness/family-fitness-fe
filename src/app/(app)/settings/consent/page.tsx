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
import { useBodyStore } from "@/stores/body-store";
import { usePhotoStore } from "@/stores/photo-store";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/domain/profile-avatar";
import { ConsentTermsSheet, TermsRow } from "@/components/domain/consent-terms-sheet";
import { useBackSheet } from "@/components/ui/use-back-sheet";
import { CONSENT_TERMS, type ConsentKind } from "@/lib/legal";

/** 보호자 동의 관리. 동의마다 상세내용을 볼 수 있다 — 시트로, 뒤로 가기를 눌러도 이 화면에 남는다(9/28) */
function ConsentPageContent() {
  const terms = useBackSheet<ConsentKind>();
  const {
    familyId,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
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
  const failure = sessionError ?? (family ? null : familyError);
  if (failure) {
    return (
      <>
        <PageHeader title="보호자 동의" back />
        <Screen>
          <ErrorState
            error={failure}
            onRetry={() => void (sessionError ? refetchMe() : refetch())}
            retrying={isRefetching}
          />
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
          // 내용은 전부 카드 위 — 동의 줄만 회색 바탕에 떠 있었다
          <ul className="card divide-rows py-0">
            {needConsent.map((child) => (
              <ConsentRow key={child.profileId} child={child} familyId={familyId ?? ""} />
            ))}
          </ul>
        )}

        <ul className="card divide-rows py-1" aria-label="동의 내용">
          <TermsRow title={CONSENT_TERMS.personal.title} onClick={() => terms.show("personal")} />
          <TermsRow title={CONSENT_TERMS.health.title} onClick={() => terms.show("health")} />
        </ul>
      </Screen>
      <ConsentTermsSheet kind={terms.value} open={terms.open} onClose={terms.hide} />
    </>
  );
}

function ConsentRow({ child, familyId }: { child: ProfileSummary; familyId: string }) {
  const update = useUpdateConsent(child.profileId ?? "", familyId);
  const removePhoto = usePhotoStore((s) => s.remove);
  const clearBody = useBodyStore((s) => s.clear);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const given = child.consentGiven ?? false;

  const apply = async (personalData: boolean, healthData: boolean) => {
    setError(null);
    try {
      await update.mutateAsync({ personalData, healthData });
      // 동의를 거두면 이 기기에 둔 아이 사진 · 키 · 몸무게도 지운다 — 건강정보와 함께 거둔 것이다(방침 제9조)
      if (!personalData && child.profileId) {
        removePhoto(child.profileId);
        clearBody(child.profileId);
      }
      setConfirming(false);
    } catch (e) {
      setError(
        errorMessage(e, { NOT_A_PARENT: "보호자 계정에서만 바꿀 수 있어요." }, "바꾸지 못했어요."),
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
          <p className="text-body text-ink-soft">
            동의를 철회하면 {child.name}의 체력 측정 기록과 운동 기록이 모두 삭제되며, 삭제한 기록은
            되돌릴 수 없어요. 프로필과 동의 이력은 남고, 다시 동의하면 새로 기록할 수 있어요.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setConfirming(false)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              loading={update.isPending}
              onClick={() => apply(false, false)}
            >
              철회하고 삭제
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
