"use client";

import { Check } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { Card, CardHead } from "@/components/ui/card";
import { Dock } from "@/components/ui/dock";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { StickerArt } from "@/components/domain/sticker-art";
import { Confetti } from "@/components/scene/confetti";
import { ApiError } from "@/lib/api/client";
import {
  useCalendar,
  useConfirmParticipant,
  useFamilyProfiles,
  useMissions,
  useSendCheer,
} from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { PRAISES } from "@/lib/praise";
import { useSession } from "@/lib/session";
import { MEMO_MAX, STICKERS, stickerOf } from "@/lib/stickers";
import { today } from "@/lib/today";
import { cn, withJosa } from "@/lib/utils";

/**
 * 칭찬 스티커 붙이기 — 부모가 아이에게.
 *
 * **고르기만 해도 붙는다.** 퇴근하고 지친 부모에게 글쓰기를 시키면 그날로 안 보낸다(규칙 12).
 * 스티커 이름이 곧 한마디다. 메모는 덧붙이고 싶을 때만, 한 줄.
 *
 * 붙인 스티커는 그날 캘린더에 붙고 아이에게 알림이 간다. 개수를 세지 않는다.
 * 아이가 직접 적은 기록(걸음수)이면 스티커가 곧 확인이다.
 */
export default function StickerPage() {
  return (
    <Suspense fallback={<StickerSkeleton />}>
      <StickerForm />
    </Suspense>
  );
}

function StickerForm() {
  const { profileId } = useParams<{ profileId: string }>();
  const missionId = useSearchParams().get("missionId");
  const { familyId, profile } = useSession();
  const { data: family } = useFamilyProfiles(familyId);
  const now = today();
  const { data: calendar, isPending } = useCalendar(familyId, profileId, { from: now, to: now });
  const { data: missions } = useMissions(familyId, { scope: "ALL", status: "ACTIVE" });
  const send = useSendCheer(familyId ?? "");
  const confirm = useConfirmParticipant(missionId ?? "", familyId ?? "");

  const [picked, setPicked] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [sent, setSent] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);

  const name = family?.profiles?.find((p) => p.profileId === profileId)?.name ?? "아이";
  const log = calendar?.days.find((d) => d.date === now);
  const mission = missions?.missions?.find((m) => m.missionId === missionId);
  const needsConfirm =
    mission?.participants?.find((p) => p.profileId === profileId)?.needsGuardianCheck ?? false;
  const sticker = stickerOf(picked);

  const submit = async () => {
    if (!sticker || !profile?.profileId) return;
    setProblem(null);
    try {
      // 아이가 직접 적은 기록이면 스티커가 곧 확인이다(규칙 2)
      if (needsConfirm) {
        await confirm.mutateAsync(profileId).catch((e: unknown) => {
          // 목표에 아직 못 닿았으면 확인만 건너뛰고 스티커는 붙인다
          if (e instanceof ApiError && e.code === "TARGET_NOT_REACHED") return;
          throw e;
        });
      }
      await send.mutateAsync({
        fromProfileId: profile.profileId,
        toProfileId: profileId,
        stickerId: sticker.id,
        message: memo.trim() || sticker.label,
        missionId: missionId ?? undefined,
      });
      setSent((n) => n + 1);
    } catch (e) {
      setProblem(
        errorMessage(
          e,
          { NOT_A_PARENT: "스티커는 보호자 계정에서 붙일 수 있어요." },
          "붙이지 못했어요. 잠시 후 다시 해 주세요.",
        ),
      );
    }
  };

  if (sent > 0 && sticker) {
    return (
      <>
        <Confetti fire={sent} pieces={90} from="top" />
        <AppBar backHref="/parent" title="칭찬 스티커" />
        <Stage wide className="flex flex-col items-center pt-8 text-center">
          <StickerArt id={sticker.id} className="badge-pop size-36" />
          <h2 className="page-title mt-4">붙였어요</h2>
          <div className="mt-6 grid w-full gap-2">
            <NavLink
              href={`/calendar/${now}?profileId=${encodeURIComponent(profileId)}`}
              className="press bg-sub flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold"
            >
              캘린더에서 보기
            </NavLink>
            <NavLink
              href="/parent"
              transitionTypes={["nav-back"]}
              className="press bg-signal-strong flex min-h-12 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
            >
              홈으로
            </NavLink>
          </div>
        </Stage>
      </>
    );
  }

  return (
    <>
      <AppBar backHref="/parent" title="칭찬 스티커" />
      <Stage wide className="space-y-3 pb-32">
        <section className="card-hero">
          {isPending ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <h2 className="text-lead font-extrabold">
              {log && log.minutes > 0
                ? `오늘 ${withJosa(name, "은는")} ${log.minutes}분 움직였어요`
                : `오늘 ${name}에게 붙여 줄 스티커`}
            </h2>
          )}
          {log && log.entries.length > 0 && (
            <p className="text-caption text-ink-soft mt-1">
              {log.entries.map((e) => e.title).join(" · ")}
            </p>
          )}
          {/* 고른 것 하나가 크게 */}
          <div className="bg-sub mt-4 grid h-36 place-items-center rounded-2xl">
            {sticker ? (
              <div key={sticker.id} className="badge-pop flex flex-col items-center gap-1">
                <StickerArt id={sticker.id} className="size-24" />
                <p className="text-sm font-extrabold">{memo.trim() || sticker.label}</p>
              </div>
            ) : (
              <span
                aria-hidden
                className="border-line bg-paper size-24 rounded-full border-2 border-dashed"
              />
            )}
          </div>
        </section>

        <Card>
          <CardHead title="스티커" />
          <ul className="mt-2 grid grid-cols-4 gap-2" aria-label="스티커">
            {STICKERS.map((s) => {
              const on = s.id === picked;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked(s.id)}
                    className={cn(
                      "press flex w-full flex-col items-center gap-1 rounded-2xl px-1 pt-2 pb-1.5",
                      on ? "bg-signal-soft ring-signal-strong ring-2" : "bg-sub",
                    )}
                  >
                    <StickerArt id={s.id} className="size-11" />
                    <span className="text-micro leading-tight font-bold">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHead title="한마디 더" />
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))}
            placeholder={sticker ? sticker.label : "한마디"}
            aria-label="한마디"
            className="field mt-2"
          />
          <div className="scroll-row -mx-4.5 mt-2 px-4.5">
            <ul className="flex gap-2">
              {PRAISES.slice(0, 5).map((text) => (
                <li key={text}>
                  <button type="button" onClick={() => setMemo(text)} className="chip press">
                    {text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </Stage>

      <Dock>
        {problem && (
          <p role="alert" className="text-signal-deep mb-2 text-center text-sm font-semibold">
            {problem}
          </p>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!sticker || send.isPending || confirm.isPending}
          className="press bg-signal-strong shadow-lift flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold text-white disabled:opacity-50"
        >
          <Check aria-hidden className="size-5" strokeWidth={3} />
          {send.isPending
            ? "붙이는 중"
            : sticker
              ? `${sticker.label} 붙이기`
              : "스티커를 골라 주세요"}
        </button>
      </Dock>
    </>
  );
}

function StickerSkeleton() {
  return (
    <>
      <AppBar title="칭찬 스티커" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
