"use client";

import { Bell, ChevronRight } from "lucide-react";
import { useEffect } from "react";

import { AppBar } from "@/components/app-shell/app-bar";
import { Stage } from "@/components/app-shell/stage";
import { ArtIcon } from "@/components/ui/art-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { NavLink } from "@/components/ui/nav-link";
import { Skeleton } from "@/components/ui/skeleton";
import { StickerArt } from "@/components/domain/sticker-art";
import type { NotificationView } from "@/lib/api/types";
import { useMarkNotificationsRead, useNotifications } from "@/lib/api/queries";
import { notificationArt, notificationHref, whenOf } from "@/lib/notifications";
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
 */
export default function NotificationsPage() {
  const kidView = useIsKidView();
  const { profile, isPending: sessionPending } = useSession();
  const childProfileId = useRoleStore((s) => s.childProfileId);
  const me = kidView ? (childProfileId ?? undefined) : (profile?.profileId ?? undefined);
  const { data, isPending, error, refetch } = useNotifications(me);
  const markRead = useMarkNotificationsRead(me);

  const unread = data?.unread ?? 0;
  const mark = markRead.mutate;
  useEffect(() => {
    if (unread > 0) mark();
  }, [unread, mark]);

  const back = kidView ? "/kid" : "/parent";
  if (sessionPending || isPending) return <NotificationsSkeleton back={back} />;
  if (error) {
    return (
      <>
        <AppBar backHref={back} title="알림" />
        <Stage wide>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Stage>
      </>
    );
  }

  const items = data?.items ?? [];
  const fresh = items.filter((n) => !n.read);
  const old = items.filter((n) => n.read);

  return (
    <>
      <AppBar backHref={back} title="알림" />
      <Stage wide className="space-y-4">
        {items.length === 0 && (
          <EmptyState
            scene="no-cheer"
            title="아직 알림이 없어요"
            description={
              kidView
                ? "엄마 · 아빠가 스티커를 붙여 주면 여기에 와요"
                : "아이가 운동을 마치면 여기에 와요"
            }
          />
        )}
        {fresh.length > 0 && <Group title="새로 온 것" items={fresh} />}
        {old.length > 0 && <Group title="지난 것" items={old} />}
      </Stage>
    </>
  );
}

function Group({ title, items }: { title: string; items: NotificationView[] }) {
  return (
    <section>
      <h2 className="text-caption text-ink-soft mb-2 px-1 font-extrabold">{title}</h2>
      <ul className="card divide-rows py-1">
        {items.map((n) => (
          <li key={n.notificationId}>
            <Row item={n} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ item }: { item: NotificationView }) {
  const href = notificationHref(item);
  const inner = (
    <>
      <span className="bg-sub relative grid size-12 shrink-0 place-items-center rounded-2xl">
        {item.kind === "PRAISE" ? (
          <StickerArt id={item.stickerId} className="size-8" />
        ) : (
          <ArtIcon name={notificationArt(item)} fallback={Bell} className="size-8" />
        )}
        {!item.read && (
          <span className="bg-signal ring-paper absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", item.read ? "font-bold" : "font-extrabold")}>
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
