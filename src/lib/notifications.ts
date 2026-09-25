import type { NotificationView } from "./api/types";
import { stickerOf } from "./stickers";
import { dayOf, daysBefore, today } from "./today";

/**
 * 알림을 누르면 갈 곳.
 *
 * 서버는 무슨 일이 있었는지(`kind` · 누구 · 어느 운동 · 어느 날)만 알려 주고,
 * 어느 화면으로 갈지는 화면이 정한다 — 화면 주소를 서버가 알 까닭이 없다.
 */
export function notificationHref(n: NotificationView): string | null {
  switch (n.kind) {
    case "KID_DONE":
      return n.aboutProfileId
        ? `/parent/sticker/${n.aboutProfileId}${n.missionId ? `?missionId=${n.missionId}` : ""}`
        : null;
    case "REMEASURE":
      return n.aboutProfileId ? `/p/${n.aboutProfileId}/measure` : null;
    case "PRAISE":
      return n.date ? `/calendar/${n.date}` : "/calendar";
    case "MISSION_READY":
      return n.missionId ? `/kid/m/${n.missionId}` : "/kid";
    case "ACHIEVEMENT":
      return "/kid/badges";
    case "KID_THANKS":
      return null;
    default:
      return null;
  }
}

/** 알림 그림. 받은 스티커는 그 스티커 그대로 */
export function notificationArt(n: NotificationView): string {
  switch (n.kind) {
    case "KID_DONE":
      return "icon/menu-cheer";
    case "REMEASURE":
      return "icon/menu-measure";
    case "PRAISE":
      return stickerOf(n.stickerId)?.art ?? "sticker/sticker-star";
    case "MISSION_READY":
      return "icon/menu-ai";
    case "ACHIEVEMENT":
      return "icon/menu-trophy";
    case "KID_THANKS":
      return stickerOf(n.stickerId)?.art ?? "icon/menu-cheer";
    default:
      return "icon/menu-cheer";
  }
}

/** 「오늘 오후 7:12」 · 「어제」 · 「9월 20일」 */
export function whenOf(iso: string, now: string = today()): string {
  const date = dayOf(iso);
  if (date === now) {
    const d = new Date(iso);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `오늘 ${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${m}`;
  }
  if (date === daysBefore(1, now)) return "어제";
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일`;
}
