"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LevelBuddy } from "@/components/domain/level-buddy";
import { Celebrate } from "@/components/scene/celebrate";
import { errorMessage } from "@/lib/errors";
import { useFamilyProfiles, useSendCheer } from "@/lib/api/queries";

/** 다 했을 때. */
export function DoneCard({
  familyId,
  childProfileId,
  missionId,
  title,
  note,
  onHome,
}: {
  familyId: string;
  childProfileId: string;
  missionId: string | undefined;
  title: string;
  /** 기록이 남지 않았을 때처럼, 축하와 함께 알려야 할 한 줄 */
  note?: string;
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
      setError(errorMessage(e, "알리지 못했어요. 다시 해 볼까요?"));
    }
  };

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Celebrate show />

      <LevelBuddy stage={3} size={160} cheer />
      {/* 이 카드가 놓이는 화면이 이미 제목을 달고 있다 */}
      <h2 className="mt-3 text-2xl font-extrabold">다 했어요!</h2>
      <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">{title}</p>

      {/* 축하는 축하대로 하고, 기록이 안 남은 건 따로 말해 준다 */}
      {note && <p className="text-faint mt-2 text-xs leading-relaxed">{note}</p>}

      {told ? (
        <>
          <p className="bg-done-soft text-done mt-6 rounded-2xl px-5 py-4 text-base font-extrabold">
            부모님께 알렸어요
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
