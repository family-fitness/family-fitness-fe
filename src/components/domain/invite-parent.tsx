"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { useFamilyProfiles, useSendCheer } from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

/**
 * 아이가 부모에게 같이 하자고 조르는 자리.
 *
 * 지금까지 가족을 잇는 길은 **아이가 다 하고 나서 알리는 것** 하나뿐이었다.
 * 그러면 아이는 늘 혼자 시작한다. 시작하기 전에도 부를 수 있어야
 * "부모가 같이 해 주는 것" 이 된다 — 기획서에서 서준이 바란 것이 그거다.
 *
 * 조르기지 칭찬이 아니다. 칭찬은 부모만 보낸다(도메인 규칙 12).
 */
export function InviteParent({
  familyId,
  childProfileId,
  className,
}: {
  familyId: string;
  childProfileId: string;
  className?: string;
}) {
  const { data: family } = useFamilyProfiles(familyId);
  const send = useSendCheer(familyId);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parents = (family?.profiles ?? []).filter((p) => p.role === "PARENT");
  if (parents.length === 0) return null;

  if (sent) {
    return (
      <p
        className={cn(
          "border-done bg-done-soft text-done flex items-center gap-2 rounded-2xl border p-4 text-sm font-extrabold",
          className,
        )}
      >
        <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden />
        같이 하자고 말했어요
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={send.isPending}
        onClick={async () => {
          setError(null);
          try {
            // 부모가 여럿이면 모두에게. 아이에게 누구를 부를지 고르게 하지 않는다
            await Promise.all(
              parents.map((parent) =>
                send.mutateAsync({
                  fromProfileId: childProfileId,
                  toProfileId: parent.profileId ?? "",
                  // 남는 말이라 「오늘」 을 넣지 않는다 — 다음 날 알림함에서 읽으면 틀린 말이 된다
                  message: "같이 운동할래요?",
                  kind: "CALL",
                }),
              ),
            );
            setSent(true);
          } catch (e) {
            setError(errorMessage(e, "말하지 못했어요. 다시 해 볼까요?"));
          }
        }}
        className="press border-line flex w-full items-center gap-3 rounded-2xl border p-4 text-left disabled:opacity-55"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold">같이 하자고 하기</span>
          <span className="text-ink-soft text-caption block">
            {parents.map((p) => p.name).join(" · ")}에게
          </span>
        </span>
      </button>

      {error && (
        <p role="alert" className="text-signal-deep mt-2 text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
