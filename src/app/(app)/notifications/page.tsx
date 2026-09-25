"use client";

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StickerArt } from "@/components/domain/sticker-art";
import type { NotificationView } from "@/lib/api/types";
import {
  useCheers,
  useMarkNotificationsRead,
  useNotifications,
  useSendCheer,
} from "@/lib/api/queries";
import { errorMessage } from "@/lib/errors";
import { notificationArt, notificationHref, whenOf } from "@/lib/notifications";
import { THANKS_STICKERS, type Sticker } from "@/lib/stickers";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useIsKidView } from "@/lib/view-role";
import { useRoleStore } from "@/stores/role-store";

/**
 * 알림 — 부모와 아이가 각자 자기 것을 본다.
 *
 * 문구는 서버가 짓고 그대로 내보낸다(규칙 9). 누르면 그 일을 하는 화면으로 간다 —
 * 부모는 스티커 붙이기 · 다시 재기로, 아이는 캘린더 그날 · 운동하기 · 업적으로.
 *
 * 들어오면 다 읽은 것으로 친다. 이번에 새로 온 것은 이 화면에 있는 동안 점을 그대로 둔다 —
 * 들어오자마자 점이 사라지면 무엇이 새로 왔는지 못 본다.
 *
 * 아이는 받은 스티커 아래에서 **고마워요 스티커를 돌려보낼 수 있다**(애플 피트니스 「공유」 의
 * 주고받기처럼). 칭찬은 부모가 보내고(규칙 12), 아이가 보내는 건 「고마워요」 다. 한 장에 한 번.
 */
export default function NotificationsPage() {
  const kidView = useIsKidView();
  const {
    profile,
    isPending: sessionPending,
    error: sessionError,
    refetch: refetchMe,
  } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const me = kidView ? (childProfileId ?? undefined) : (profile?.profileId ?? undefined);
  // 꺼진 조회(누구 것인지 모를 때)의 isPending 은 영영 true 다 — isLoading 으로 본다
  const { data, isLoading, error: listError, refetch } = useNotifications(me);
  const markRead = useMarkNotificationsRead(me);
  // 60초마다 다시 받는다 — 한 번 못 받았다고 읽던 목록을 오류 화면으로 바꾸지 않는다
  const error = sessionError ?? (data ? null : listError);

  /*
    이 화면에 있는 동안 새로 온 것 — 읽은 것으로 친 뒤에도 점을 그대로 둔다. 서버의 read 만 보면 60초마다
    다시 받는 순간 「지난 것」 으로 내려가, 읽는 도중에 무엇이 새로 왔는지 사라졌다
  */
  const [seenFresh, setSeenFresh] = useState<ReadonlySet<string>>(() => new Set());
  const unreadIds = (data?.items ?? []).filter((n) => !n.read).map((n) => n.notificationId);
  if (unreadIds.some((id) => !seenFresh.has(id)))
    setSeenFresh(new Set([...seenFresh, ...unreadIds]));

  const unread = data?.unread ?? 0;
  const mark = markRead.mutate;
  useEffect(() => {
    if (unread > 0) mark();
  }, [unread, mark]);

  const back = kidView ? "/kid" : "/parent";
  if (sessionPending || isLoading) return <NotificationsSkeleton back={back} />;
  if (error) {
    return (
      <>
        <AppBar backHref={back} title="알림" />
        <Stage wide>
          <ErrorState error={error} onRetry={() => void (sessionError ? refetchMe() : refetch())} />
        </Stage>
      </>
    );
  }
  // 아이 화면인데 아직 누구인지 안 골랐다
  if (!me) {
    return (
      <>
        <AppBar backHref={back} title="알림" />
        <Stage wide>
          <EmptyState scene="waiting" title="누구인지 골라 주세요" />
        </Stage>
      </>
    );
  }

  const items = data?.items ?? [];
  const isFresh = (n: NotificationView) => !n.read || seenFresh.has(n.notificationId);
  const fresh = items.filter(isFresh);
  const old = items.filter((n) => !isFresh(n));
  // 받은 스티커마다 「그 사람이 다음 스티커를 붙인 때」 — 고마워요는 그 사이에 보낸 것만 이 스티커 몫이다
  const until = nextStickerAt(items);

  return (
    <>
      <AppBar backHref={back} title="알림" />
      <Stage wide className="space-y-4">
        {items.length === 0 && <EmptyState scene="no-alarm" title="아직 알림이 없어요" />}
        {fresh.length > 0 && (
          <Group title="새로 온 것" items={fresh} kidView={kidView} until={until} fresh />
        )}
        {old.length > 0 && <Group title="지난 것" items={old} kidView={kidView} until={until} />}
      </Stage>
    </>
  );
}

/** 스티커 알림마다, 같은 사람이 그다음에 붙인 스티커의 시각. 없으면 무한 */
function nextStickerAt(items: NotificationView[]): Map<string, number> {
  const stickers = items
    .filter((n) => n.kind === "PRAISE" && n.stickerId && n.fromProfileId)
    .map((n) => ({ n, at: Date.parse(n.createdAt) }));
  return new Map(
    stickers.map(({ n, at }) => [
      n.notificationId,
      Math.min(
        Infinity,
        ...stickers
          .filter((m) => m.n.fromProfileId === n.fromProfileId && m.at > at)
          .map((m) => m.at),
      ),
    ]),
  );
}

function Group({
  title,
  items,
  kidView,
  until,
  fresh = false,
}: {
  title: string;
  items: NotificationView[];
  kidView: boolean;
  until: Map<string, number>;
  /** 이 화면에서 새로 온 것 — 읽은 것으로 친 뒤에도 점을 둔다 */
  fresh?: boolean;
}) {
  return (
    <section>
      <h2 className="text-caption text-ink-soft mb-2 px-1 font-extrabold">{title}</h2>
      <ul className="card divide-rows py-1">
        {items.map((n) => (
          <li key={n.notificationId}>
            <Row item={n} fresh={fresh} />
            {kidView && n.kind === "PRAISE" && n.stickerId && n.fromProfileId && (
              <Thanks
                item={n}
                to={n.fromProfileId}
                until={until.get(n.notificationId) ?? Infinity}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * 받은 스티커에 고마워요 돌려보내기. 한 장에 한 번 — 이 스티커를 받은 뒤, 그 사람이 다음 스티커를
 * 붙이기 전에 보낸 고마워요가 있으면 「보냈어요」. 스티커를 고르기만 해도 간다.
 * 보낸 목록을 받기 전에는 단추를 내지 않는다 — 이미 보낸 것을 또 보내지 않게.
 */
function Thanks({ item, to, until }: { item: NotificationView; to: string; until: number }) {
  const { familyId } = useSession();
  const kidId = useRoleStore((s) => s.childProfileId);
  const { data: given, isPending } = useCheers(familyId, to);
  const send = useSendCheer(familyId ?? "");
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** 방금 보냈다 — 목록을 다시 받기 전에도 「보냈어요」 로 */
  const [justSent, setJustSent] = useState(false);

  const from = Date.parse(item.createdAt);
  const sent =
    justSent ||
    (given?.cheers ?? []).some((c) => {
      const at = Date.parse(c.createdAt);
      return c.fromProfileId === kidId && Boolean(c.stickerId) && at > from && at < until;
    });

  const pick = async (sticker: Sticker) => {
    if (!kidId) return;
    setProblem(null);
    try {
      await send.mutateAsync({
        fromProfileId: kidId,
        toProfileId: to,
        message: `고마워요 · ${sticker.label}`,
        stickerId: sticker.id,
      });
      setJustSent(true);
      setOpen(false);
    } catch (e) {
      setProblem(errorMessage(e, "보내지 못했어요."));
    }
  };

  if (!kidId || isPending) return null;
  return (
    <div className="-mt-1 pb-3 pl-15">
      {sent ? (
        <p className="text-caption text-done flex min-h-10 items-center gap-1 font-bold">
          <Check aria-hidden className="size-4" strokeWidth={3} />
          고마워요를 보냈어요
        </p>
      ) : (
        /* 글 단추 하나 — 알림마다 파랑 알약이 서면 해야 할 일 목록처럼 보인다(보내라고 재촉하지 않는다) */
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press text-signal-deep inline-flex min-h-10 items-center text-sm font-extrabold"
        >
          고마워요 보내기
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="고마워요 스티커">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {THANKS_STICKERS.map((st) => (
            <button
              key={st.id}
              type="button"
              disabled={send.isPending || justSent}
              onClick={() => void pick(st)}
              className="press bg-sub flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-2xl disabled:opacity-60"
            >
              <StickerArt id={st.id} className="size-14" />
              <span className="text-sm font-extrabold">{st.label}</span>
            </button>
          ))}
        </div>
        {problem && (
          <p role="alert" className="text-signal-deep mt-1 text-sm font-semibold">
            {problem}
          </p>
        )}
      </Sheet>
    </div>
  );
}

function Row({ item, fresh }: { item: NotificationView; fresh: boolean }) {
  const href = notificationHref(item);
  const inner = (
    <>
      <span className="relative grid size-12 shrink-0 place-items-center">
        {item.kind === "PRAISE" || item.kind === "KID_THANKS" ? (
          <StickerArt id={item.stickerId} className="size-10" />
        ) : (
          <ArtIcon name={notificationArt(item)} className="size-10" />
        )}
        {fresh && (
          <span className="bg-signal ring-paper absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", fresh ? "font-extrabold" : "font-bold")}>
          {item.title}
        </p>
        {item.body && <p className="text-caption text-ink-soft mt-0.5 line-clamp-2">{item.body}</p>}
        <p className="text-micro text-faint mt-1 font-semibold">{whenOf(item.createdAt)}</p>
      </div>
      {href && <ChevronRight aria-hidden className="text-faint size-4 shrink-0" />}
    </>
  );
  return href ? (
    <NavLink href={href} className="press flex items-center gap-3 py-3">
      {inner}
    </NavLink>
  ) : (
    <div className="flex items-center gap-3 py-3">{inner}</div>
  );
}

function NotificationsSkeleton({ back }: { back: string }) {
  return (
    <>
      <AppBar backHref={back} title="알림" />
      <Stage wide className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </Stage>
    </>
  );
}
