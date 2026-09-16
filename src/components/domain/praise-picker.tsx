"use client";

import { useState } from "react";

import type { Mission } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { KidCharacter } from "@/components/domain/kid-character";
import { Celebrate } from "@/components/scene/celebrate";
import { ApiError } from "@/lib/api/client";
import { useConfirmParticipant, useSendCheer } from "@/lib/api/queries";
import { PRAISES } from "@/lib/praise";
import { cn, withJosa } from "@/lib/utils";

/** 칭찬 보내기. */
export function PraisePicker({
  open,
  onClose,
  familyId,
  fromProfileId,
  toProfileId,
  toName,
  mission,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  fromProfileId: string;
  toProfileId: string;
  toName: string;
  mission: Mission | null;
}) {
  const [cheering, setCheering] = useState(false);

  return (
    <>
      <Celebrate show={cheering} />
      <Sheet open={open} onClose={onClose} title={`${withJosa(toName, "이가")} 해냈어요`}>
        {/*
          고른 말은 이 안쪽에 둔다. 시트가 닫히면 통째로 사라져서 다음에 열 때
          저절로 처음 상태가 된다 — effect 로 되돌리지 않아도 된다.
        */}
        <PraiseForm
          familyId={familyId}
          fromProfileId={fromProfileId}
          toProfileId={toProfileId}
          mission={mission}
          onDone={() => {
            setCheering(true);
            setTimeout(() => {
              setCheering(false);
              onClose();
            }, 1500);
          }}
        />
      </Sheet>
    </>
  );
}

function PraiseForm({
  familyId,
  fromProfileId,
  toProfileId,
  mission,
  onDone,
}: {
  familyId: string;
  fromProfileId: string;
  toProfileId: string;
  mission: Mission | null;
  onDone: () => void;
}) {
  const send = useSendCheer(familyId);
  const confirm = useConfirmParticipant(mission?.missionId ?? "", familyId);

  const [picked, setPicked] = useState<string>(PRAISES[0]);
  const [own, setOwn] = useState("");
  const [error, setError] = useState<string | null>(null);

  const message = own.trim() || picked;
  const participant = mission?.participants?.find((p) => p.profileId === toProfileId);
  const needsConfirm = participant?.needsGuardianCheck ?? false;

  const submit = async () => {
    setError(null);
    try {
      // 아이가 직접 적은 기록이면 칭찬이 곧 확인이다
      if (needsConfirm) {
        await confirm.mutateAsync(toProfileId).catch((e: unknown) => {
          // 목표에 아직 못 닿았으면 확인만 건너뛰고 칭찬은 보낸다
          if (e instanceof ApiError && e.code === "TARGET_NOT_REACHED") return;
          throw e;
        });
      }
      await send.mutateAsync({
        fromProfileId,
        toProfileId,
        message,
        missionId: mission?.missionId,
      });
      onDone();
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "NOT_A_PARENT"
          ? "칭찬은 보호자 계정에서 보낼 수 있어요."
          : e instanceof ApiError
            ? e.userMessage
            : "보내지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <KidCharacter motion="cheer" size={72} />
        <p className="bg-signal-soft text-signal-deep text-body min-w-0 flex-1 rounded-2xl rounded-bl-md px-4 py-3 leading-relaxed font-bold">
          {message}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {PRAISES.map((text) => (
          <li key={text}>
            <button
              type="button"
              onClick={() => {
                setPicked(text);
                setOwn("");
              }}
              aria-pressed={!own && picked === text}
              className={cn(
                "press w-full rounded-xl border px-3 py-3 text-sm font-bold",
                !own && picked === text
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
        value={own}
        onChange={(e) => setOwn(e.target.value.slice(0, 100))}
        placeholder="직접 쓰기"
        aria-label="직접 쓴 칭찬"
        className="field"
      />

      {error && (
        <p role="alert" className="text-signal-deep text-sm font-semibold">
          {error}
        </p>
      )}

      <Button size="block" loading={send.isPending || confirm.isPending} onClick={submit}>
        칭찬 보내기
      </Button>
    </div>
  );
}
