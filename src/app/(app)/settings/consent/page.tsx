"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { ParentOnly } from "@/components/app-shell/parent-only";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { errorMessage } from "@/lib/errors";
import type { ProfileSummary } from "@/lib/api/types";
import { useFamilyProfiles, useUpdateConsent } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/domain/profile-avatar";

/** 보호자 동의 관리. */
function ConsentPageContent() {
  const { profile, familyId, isPending: sessionPending } = useSession();
  const { data: family, isLoading: familyLoading } = useFamilyProfiles(familyId);

  if (sessionPending || familyLoading) return <ConsentSkeleton />;

  if (profile?.role === "CHILD") {
    return (
      <>
        <PageHeader title="보호자 동의" back />
        <Screen>
          <EmptyState scene="waiting" title="이 설정은 보호자만 있어요" />
        </Screen>
      </>
    );
  }

  const needConsent = (family?.profiles ?? []).filter((p) => p.consentRequired);

  return (
    <>
      <PageHeader title="보호자 동의" back />

      <Screen className="space-y-6">
        <p className="text-ink-soft text-sm leading-relaxed">
          만 14세 미만 가족의 측정 기록을 저장하려면 보호자 동의가 필요해요. 개인정보와 건강정보 두
          가지에 모두 동의해야 저장돼요.
        </p>

        {needConsent.length === 0 ? (
          <EmptyState scene="waiting" title="동의가 필요한 가족이 없어요" />
        ) : (
          <ul className="divide-rows">
            {needConsent.map((child) => (
              <ConsentRow key={child.profileId} child={child} familyId={familyId ?? ""} />
            ))}
          </ul>
        )}

        <p className="text-faint text-caption leading-relaxed">
          동의를 철회해도 이미 저장된 측정 기록은 지워지지 않아요. 기록 삭제가 필요하면 가족
          설정에서 프로필을 지워 주세요.
        </p>
      </Screen>
    </>
  );
}

function ConsentRow({ child, familyId }: { child: ProfileSummary; familyId: string }) {
  const update = useUpdateConsent(child.profileId ?? "", familyId);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const given = child.consentGiven ?? false;

  const apply = async (personalData: boolean, healthData: boolean) => {
    setError(null);
    try {
      await update.mutateAsync({ personalData, healthData });
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
            {given ? "동의함 · 측정을 저장할 수 있어요" : "동의 없음 · 측정을 저장할 수 없어요"}
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

      {/* 되돌리기 어려운 동작이라 무슨 일이 생기는지 미리 적는다 */}
      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`${child.name}의 동의를 철회할까요`}
      >
        <div className="space-y-4">
          <ul className="text-ink-soft space-y-2 text-sm leading-relaxed">
            <li>· 새 측정을 저장할 수 없어요</li>
            <li>· 10년 위 연령대 보기를 쓸 수 없어요</li>
            <li>· 이미 저장된 기록은 지워지지 않아요</li>
            <li>· 다시 동의하면 바로 되돌아와요</li>
          </ul>
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
        <Skeleton className="h-12 w-full" />
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
