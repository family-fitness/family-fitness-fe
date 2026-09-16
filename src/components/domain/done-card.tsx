"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { KidCharacter } from "@/components/domain/kid-character";
import { Celebrate } from "@/components/scene/celebrate";
import { ApiError } from "@/lib/api/client";
import { useFamilyProfiles, useSendCheer } from "@/lib/api/queries";

/**
 * 다 했을 때.
 *
 * **아이가 부모에게 알리는 자리다.** 아이는 알리고, 부모가 칭찬을 보낸다.
 * 아이가 자기에게 칭찬할 수 없다 — 그래야 받은 말에 값이 생긴다(규칙 12).
 *
 * 알린 뒤에는 재촉하지 않는다. "아직 안 봤어요" 같은 말을 띄우면 아이가 부모를
 * 기다리는 게 아니라 조르게 된다.
 */
export function DoneCard({
  familyId,
  childProfileId,
  missionId,
  title,
  onHome,
}: {
  familyId: string;
  childProfileId: string;
  missionId: string | undefined;
  title: string;
  onHome: () => void;
}) {
  const { data: family } = useFamilyProfiles(familyId);
  const send = useSendCheer(familyId);

  const [told, setTold] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parents = (family?.profiles ?? []).filter((p) => p.role === "PARENT");

  const tell = async () => {
    setError(null);
    try {
      // 부모가 여럿이면 모두에게 알린다. 아이에게 누구에게 보낼지 고르게 하지 않는다
      await Promise.all(
        parents.map((parent) =>
          send.mutateAsync({
            fromProfileId: childProfileId,
            toProfileId: parent.profileId ?? "",
            message: `${title} 다 했어요!`,
            missionId,
          }),
        ),
      );
      setTold(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.userMessage : "알리지 못했어요. 다시 해 볼까요?");
    }
  };

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Celebrate show />

      <KidCharacter motion="cheer" size={170} animate />
      <h1 className="mt-3 text-2xl font-extrabold">다 했어요!</h1>
      <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">{title}</p>

      {told ? (
        <>
          <p className="bg-done-soft text-done mt-6 rounded-2xl px-5 py-4 text-base font-extrabold">
            부모님께 알렸어요
          </p>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            칭찬이 오면 홈에서 볼 수 있어요.
          </p>
        </>
      ) : (
        <Button
          size="kid"
          className="mt-6"
          loading={send.isPending}
          disabled={parents.length === 0}
          onClick={tell}
        >
          엄마·아빠한테 알리기
        </Button>
      )}

      {error && (
        <p role="alert" className="text-signal-deep mt-3 text-sm font-bold">
          {error}
        </p>
      )}

      <Button size="md" variant="ghost" className="mt-4" onClick={onHome}>
        홈으로
      </Button>
    </div>
  );
}
