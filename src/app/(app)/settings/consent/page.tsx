"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Screen } from "@/components/app-shell/screen";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/illustration";
import { ApiError } from "@/lib/api/client";
import type { ProfileSummary } from "@/lib/api/types";
import { useFamilyProfiles, useUpdateConsent } from "@/lib/api/queries";
import { useSession } from "@/lib/session";
import { avatarFor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * 보호자 동의 관리.
 *
 * 만 14세 미만 프로필은 개인정보·건강정보 동의가 둘 다 있어야 측정을 저장할 수 있다.
 * **서버가 동의를 자동으로 찍지 않는다** — 보호자가 직접 켠다.
 *
 * 철회는 되돌리기 어려운 동작이라 한 번 묻는다. 무슨 일이 생기는지 미리 적는다 —
 * "동의 철회" 다섯 글자만 두면 무엇이 멈추는지 알 수 없다.
 *
 * 과거 기록은 지우지 않는다. 그 사실도 화면에 적는다.
 */
export default function ConsentPage() {
  const { profile, familyId, isPending: sessionPending } = useSession();
  const { data: family, isPending: familyPending } = useFamilyProfiles(familyId);

  if (sessionPending || familyPending) return <ConsentSkeleton />;

  if (profile?.role === "CHILD") {
    return (
      <>
        <PageHeader title="보호자 동의" back />
        <Screen>
          <EmptyState
            scene="waiting-approval"
            title="이 설정은 보호자만 있어요"
            description="건강 정보 동의는 보호자가 관리해요."
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
        <p className="text-ink-soft text-sm leading-relaxed">
          만 14세 미만 가족의 측정 기록을 저장하려면 보호자 동의가 필요해요. 개인정보와 건강정보 두
          가지에 모두 동의해야 저장돼요.
        </p>

        {needConsent.length === 0 ? (
          <EmptyState
            scene="invite"
            title="동의가 필요한 가족이 없어요"
            description="만 14세 미만 가족이 생기면 여기에서 동의를 관리해요."
          />
        ) : (
          <ul className="divide-rows">
            {needConsent.map((child) => (
              <ConsentRow key={child.profileId} child={child} familyId={familyId ?? ""} />
            ))}
          </ul>
        )}

        <p className="text-faint text-[0.7rem] leading-relaxed">
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
        e instanceof ApiError && e.code === "NOT_A_PARENT"
          ? "보호자 계정에서만 바꿀 수 있어요."
          : e instanceof ApiError
            ? e.userMessage
            : "바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  };

  return (
    <li className="py-4">
      <div className="flex items-center gap-3">
        <Avatar parts={avatarFor(child)} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-bold">{child.name}</p>
          <p className={cn("mt-0.5 text-xs font-semibold", given ? "text-done" : "text-ink-soft")}>
            {given ? "동의함 · 측정을 저장할 수 있어요" : "동의 없음 · 측정을 저장할 수 없어요"}
          </p>
        </div>

        <Button
          size="sm"
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
            <li>· 10년 뒤 보기를 쓸 수 없어요</li>
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
