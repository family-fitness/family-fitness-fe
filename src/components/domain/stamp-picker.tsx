"use client";

import { useState } from "react";

import type { Mission } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StampMark } from "@/components/domain/stamp-mark";
import { Celebrate } from "@/components/scene/celebrate";
import { ApiError } from "@/lib/api/client";
import { useConfirmParticipant, useSendCheer } from "@/lib/api/queries";
import { STAMPS } from "@/lib/stamps";
import { cn, withJosa } from "@/lib/utils";

/**
 * 도장 고르고 찍기.
 *
 * 도장 하나에 칭찬글이 딸려 있다. 부모가 아무 말도 안 적어도 아이는 문장을 받는다 —
 * 퇴근하고 지친 부모에게 글쓰기를 시키면 그날로 안 찍는다.
 *
 * 걸음수처럼 아이가 직접 적은 기록은 **도장이 곧 보호자 확인**이다.
 * 서버의 confirm 을 같이 부른다. 영상·타이머는 서버가 이미 아니까 확인만 건너뛴다.
 */
export function StampPicker({
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
          고른 도장과 적은 글은 이 안쪽에 둔다. 시트가 닫히면 통째로 사라져서
          다음에 열 때 저절로 처음 상태가 된다 — effect 로 되돌리지 않아도 된다.
        */}
        <StampForm
          familyId={familyId}
          fromProfileId={fromProfileId}
          toProfileId={toProfileId}
          mission={mission}
          onDone={() => {
            setCheering(true);
            setTimeout(() => {
              setCheering(false);
              onClose();
            }, 1600);
          }}
        />
      </Sheet>
    </>
  );
}

function StampForm({
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

  const [picked, setPicked] = useState(STAMPS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const participant = mission?.participants?.find((p) => p.profileId === toProfileId);
  const needsConfirm = participant?.needsGuardianCheck ?? false;

  const stamp = async () => {
    setError(null);
    try {
      // 아이가 직접 적은 기록이면 도장이 곧 확인이다
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
        message: note.trim() || picked.message,
        emoji: picked.key,
        missionId: mission?.missionId,
      });
      onDone();
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "NOT_A_PARENT"
          ? "도장은 보호자 계정에서 찍을 수 있어요."
          : e instanceof ApiError
            ? e.userMessage
            : "찍지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <StampMark stamp={picked.key} size={68} animate />
        <div className="min-w-0">
          <p className="text-[0.95rem] font-extrabold">{picked.label}</p>
          <p className="text-ink-soft mt-0.5 text-sm">{note.trim() || picked.message}</p>
        </div>
      </div>

      <ul className="grid grid-cols-5 gap-2">
        {STAMPS.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => setPicked(s)}
              aria-pressed={picked.key === s.key}
              aria-label={s.label}
              className={cn(
                "press grid w-full place-items-center rounded-xl border p-1.5",
                picked.key === s.key ? "border-signal bg-signal-soft" : "border-line",
              )}
            >
              <StampMark stamp={s.key} size={38} />
            </button>
          </li>
        ))}
      </ul>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 100))}
        placeholder="한마디 더 적어도 좋아요"
        aria-label="칭찬 한마디"
        className="field"
      />

      {error && (
        <p role="alert" className="text-signal-deep text-sm font-semibold">
          {error}
        </p>
      )}

      <Button size="block" loading={send.isPending || confirm.isPending} onClick={stamp}>
        도장 찍어 주기
      </Button>
    </div>
  );
}
