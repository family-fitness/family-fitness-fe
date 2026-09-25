"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { ArtIcon } from "@/components/ui/art-icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useRestDay, useRestDays } from "@/lib/api/queries";
import { artFor } from "@/lib/art";
import { errorMessage } from "@/lib/errors";
import { daysBefore, monthOf, today, weekdayOf } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * 쉬는 날 카드(9/25 「오늘 하루는 운동을 쉰다거나 가능하게」).
 *
 * 한 달에 두 장. 쓴 날은 「안 한 날」 이 아니라 「쉬기로 한 날」 이다 — 캘린더에 「쉬는 날」 로 남고,
 * 며칠 이어서 한 것이 끊기지 않고, 리그 달성률에서 빠진다. 가족 단위라 부모가 쓴다.
 * 지난 날에는 못 쓴다 — 빈 날을 나중에 덮으면 카드가 핑계가 된다. 오늘 · 이번 달 앞날만.
 */
export function RestCardRow({
  familyId,
  movedToday,
  className,
}: {
  familyId: string | undefined;
  /** 아이가 오늘 이미 움직였다 — 오늘은 쉬는 날로 못 고른다 */
  movedToday: boolean;
  /** 줄을 감싸는 자리 — 위 가름선도 여기에. 줄이 없으면 선도 없다 */
  className?: string;
}) {
  const now = today();
  const { data: rest, isLoading } = useRestDays(familyId, monthOf(now));
  const [open, setOpen] = useState(false);
  // 열 때마다 새 시트 — 지난번에 고른 날 · 지난 오류가 남아 있지 않게. 닫힐 때는 그대로 두어 내려가는 움직임이 산다
  const [round, setRound] = useState(0);
  // 받는 동안은 줄 모양으로 자리를 잡는다. 못 받으면(서버에 아직 없으면) 선째 없앤다
  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (!familyId || !rest) return null;

  const restToday = rest.days.includes(now);
  const upcoming = rest.days.filter((d) => d > now);
  // 남은 장수는 오른쪽 「2 / 2장」 이 말한다 — 같은 수를 한 줄에 두 번 쓰지 않는다
  const note = restToday
    ? "오늘은 쉬는 날이에요"
    : upcoming.length > 0
      ? `${upcoming.map((d) => `${Number(d.slice(8))}일`).join(" · ")} 쉬기로 했어요`
      : null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
        className="press flex min-h-12 w-full items-center gap-3 text-left"
      >
        {/* 그림이 오기 전에는 자리를 잡지 않는다 — 줄 앞이 비어 보인다 */}
        {artFor("icon/menu-rest") && <ArtIcon name="icon/menu-rest" className="size-8" />}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">쉬는 날 카드</span>
          {note && <span className="text-caption text-ink-soft block truncate">{note}</span>}
        </span>
        <span className="text-caption text-ink-soft shrink-0 font-bold tabular-nums">
          {rest.left} / {rest.perMonth}장
        </span>
        <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />
      </button>
      <RestCardSheet
        key={round}
        open={open}
        onClose={() => setOpen(false)}
        familyId={familyId}
        used={rest.days}
        left={rest.left}
        movedToday={movedToday}
      />
    </div>
  );
}

/** 쉬는 날 고르기 — 오늘부터 이번 달 안의 이레. 쓴 날은 되돌릴 수 있다(카드는 돌아온다) */
function RestCardSheet({
  open,
  onClose,
  familyId,
  used,
  left,
  movedToday,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  used: string[];
  left: number;
  movedToday: boolean;
}) {
  const now = today();
  const month = monthOf(now);
  const choices = Array.from({ length: 7 }, (_, i) => daysBefore(-i, now)).filter(
    (d) => monthOf(d) === month,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const restDay = useRestDay(familyId);

  const run = async (date: string, cancel?: boolean) => {
    setProblem(null);
    try {
      await restDay.mutateAsync({ date, cancel });
      setPicked(null);
      if (!cancel) onClose();
    } catch (e) {
      setProblem(
        errorMessage(
          e,
          {
            NO_REST_CARD_LEFT: "이번 달 카드를 다 썼어요.",
            ALREADY_MOVED: "그날은 이미 움직였어요.",
            ALREADY_REST_DAY: "이미 쉬는 날이에요.",
            INVALID_DATE: "오늘부터 이번 달 안의 날만 고를 수 있어요.",
          },
          "쉬는 날로 두지 못했어요. 잠시 후 다시 해 주세요.",
        ),
      );
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="쉬는 날 카드">
      <p className="text-caption text-ink-soft">이번 달 {left}장 남음</p>

      <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="쉴 날">
        {choices.map((d) => {
          const isUsed = used.includes(d);
          const blocked = d === now && movedToday;
          const on = picked === d;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={isUsed || blocked || left === 0}
              onClick={() => setPicked(d)}
              className={cn(
                "press flex min-h-16 flex-col items-center justify-center rounded-2xl text-sm font-extrabold disabled:opacity-100",
                on
                  ? "bg-signal-strong text-white"
                  : isUsed
                    ? "bg-mark-soft text-ink"
                    : "bg-sub text-ink",
                (blocked || (left === 0 && !isUsed)) && "text-faint",
              )}
            >
              <span>{d === now ? "오늘" : `${Number(d.slice(8))}일`}</span>
              <span className="text-micro font-bold">
                {isUsed ? "쉬는 날" : blocked ? "움직였어요" : weekdayOf(d)}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        size="block"
        className="mt-4"
        disabled={!picked}
        loading={restDay.isPending && !restDay.variables?.cancel}
        onClick={() => picked && void run(picked)}
      >
        {picked ? `${picked === now ? "오늘" : `${Number(picked.slice(8))}일`} 쉬기` : "쉬기"}
      </Button>

      {/* 쓴 날 되돌리기 — 오늘 · 앞날만. 카드는 돌아온다 */}
      {used.filter((d) => d >= now).length > 0 && (
        <ul className="divide-rows border-line mt-4 border-t">
          {used
            .filter((d) => d >= now)
            .map((d) => (
              <li key={d} className="flex min-h-12 items-center justify-between gap-3">
                <span className="text-sm font-bold">
                  {d === now ? "오늘" : `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`} · 쉬는
                  날
                </span>
                <button
                  type="button"
                  onClick={() => void run(d, true)}
                  disabled={restDay.isPending}
                  className="press text-signal-deep min-h-10 text-sm font-extrabold"
                >
                  되돌리기
                </button>
              </li>
            ))}
        </ul>
      )}

      {problem && (
        <p role="alert" className="text-signal-deep mt-2 text-sm font-semibold">
          {problem}
        </p>
      )}
    </Sheet>
  );
}
