/**
 * 알림 — `GET /notifications?profileId=` · `POST /notifications/read`.
 *
 * ▲ 서버에 아직 없다(`BACKEND_ASKS.md`). 목이 제안한 모양으로 답한다.
 *
 * 알림을 따로 쌓아 두지 않고 **지금 목 서버에 있는 일에서 셈한다** — 아이가 알린 것,
 * 부모가 붙인 스티커, 오늘 운동, 새 업적, 한 달이 지난 측정. 그래서 시연 중에 아이가
 * 「다 했어요」 를 누르면 부모 종에 바로 점이 뜬다. 읽은 것만 따로 기억한다.
 */
import { HttpResponse, http } from "msw";

import type { NotificationList, NotificationView } from "@/lib/api/types";
import { callName } from "@/lib/family";
import { stickerOf } from "@/lib/stickers";
import { dayOf, daysBefore, daysSince, today } from "@/lib/today";
import { josa } from "@/lib/utils";

import { BASE, db, type Profile } from "./db";
import { progressOf } from "./progress";

const READ_KEY = "ff-mock-notifications-read";

function readSet(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(READ_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    sessionStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    /* 저장이 막힌 브라우저면 이번 세션만 */
  }
}

type Draft = Omit<NotificationView, "read">;

/** 받침에 맞춰 「이/가」 를 붙인다. 「서준이가」 가 아니라 「서준이」 — 서버가 지을 말과 같게 */
const subject = (name: string) => `${name}${josa(name, "이가")}`;

function notificationsFor(profileId: string): NotificationView[] {
  const people = db.profiles.profiles ?? [];
  const me = people.find((p) => p.profileId === profileId);
  if (!me) return [];
  const items: Draft[] = [];

  if (me.role === "PARENT") {
    // 아이가 「다 했어요」 를 알렸다 · 고마워요 스티커를 보냈다
    for (const c of db.cheers) {
      if (c.toProfileId !== profileId) continue;
      const kid = people.find((p) => p.profileId === c.fromProfileId);
      if (kid?.role !== "CHILD") continue;
      if (c.stickerId) {
        items.push({
          notificationId: `thanks-${c.cheerId}`,
          kind: "KID_THANKS",
          title: `${subject(kid.name ?? "아이")} 고맙대요`,
          body: stickerOf(c.stickerId)?.label ?? c.message,
          aboutProfileId: kid.profileId ?? null,
          fromProfileId: kid.profileId ?? null,
          missionId: null,
          date: dayOf(c.createdAt),
          stickerId: c.stickerId,
          createdAt: c.createdAt,
        });
        continue;
      }
      items.push({
        notificationId: `done-${c.cheerId}`,
        kind: "KID_DONE",
        title: `${subject(kid.name ?? "아이")} 운동을 마쳤어요`,
        body: c.message,
        aboutProfileId: kid.profileId ?? null,
        missionId: c.missionId,
        date: dayOf(c.createdAt),
        stickerId: null,
        createdAt: c.createdAt,
      });
    }
    // 측정한 지 한 달이 지났다. 「오래됐어요」 라고 쓰지 않는다(규칙 11)
    for (const kid of people.filter((p) => p.role === "CHILD")) {
      const last = db.tests[kid.profileId ?? ""]?.[0]?.testedOn;
      const days = daysSince(last);
      if (!last || days === null || days < 30) continue;
      items.push({
        notificationId: `remeasure-${kid.profileId}-${last}`,
        kind: "REMEASURE",
        title: `${kid.name} 키 · 몸무게를 새로 재 볼까요`,
        body: "한 달 사이에 자랐을 거예요",
        aboutProfileId: kid.profileId ?? null,
        missionId: null,
        date: null,
        stickerId: null,
        createdAt: `${daysBefore(days - 30)}T09:00:00+09:00`,
      });
    }
  } else {
    // 받은 스티커 · 칭찬. 아이에게는 「엄마가」 · 「아빠가」 — 이름으로 부르지 않는다
    for (const c of db.cheers) {
      if (c.toProfileId !== profileId) continue;
      const sticker = stickerOf(c.stickerId);
      const from = callName(
        people.find((p) => p.profileId === c.fromProfileId) as Profile | undefined,
        c.fromName,
        true,
      );
      items.push({
        notificationId: `praise-${c.cheerId}`,
        kind: "PRAISE",
        fromProfileId: c.fromProfileId,
        title: sticker
          ? `${subject(from)} 스티커를 붙여 줬어요`
          : `${subject(from)} 칭찬을 보냈어요`,
        body: c.message,
        aboutProfileId: profileId,
        missionId: c.missionId,
        date: dayOf(c.createdAt),
        stickerId: c.stickerId ?? null,
        createdAt: c.createdAt,
      });
    }
    // 오늘 운동이 생겼다 — 아직 다 하지 않은 것만
    const now = today();
    for (const m of db.missions) {
      const mine = m.participants?.find((p) => p.profileId === profileId);
      if (!mine || mine.completed) continue;
      if ((m.startDate ?? "") > now || now > (m.endDate ?? "")) continue;
      if (m.targetMetric === "STEPS") continue;
      items.push({
        notificationId: `ready-${m.missionId}-${now}`,
        kind: "MISSION_READY",
        title: "오늘 운동이 생겼어요",
        body: m.title ?? null,
        aboutProfileId: profileId,
        missionId: m.missionId ?? null,
        date: now,
        stickerId: null,
        createdAt: `${now}T07:30:00+09:00`,
      });
    }
    // 새 업적 — 두 주 안에 받은 것
    for (const a of progressOf(profileId).achievements) {
      if (!a.earnedAt) continue;
      const days = daysSince(dayOf(a.earnedAt));
      if (days === null || days > 14) continue;
      items.push({
        notificationId: `badge-${profileId}-${a.code}`,
        kind: "ACHIEVEMENT",
        title: `새 업적 — ${a.title}`,
        body: a.description,
        aboutProfileId: profileId,
        missionId: null,
        date: dayOf(a.earnedAt),
        stickerId: null,
        createdAt: a.earnedAt,
      });
    }
  }

  const read = readSet();
  // 시각은 「Z」 와 「+09:00」 이 섞여 온다. 글자로 견주면 순서가 틀린다 — 시각으로 견준다
  const at = (iso: string) => Date.parse(iso);
  return items
    .filter((n) => at(n.createdAt) <= Date.now())
    .sort((a, b) => at(b.createdAt) - at(a.createdAt))
    .slice(0, 30)
    .map((n) => ({ ...n, read: read.has(n.notificationId) }));
}

export const notifications = [
  http.get(`${BASE}/notifications`, ({ request }) => {
    const profileId = new URL(request.url).searchParams.get("profileId") ?? "";
    const items = notificationsFor(profileId);
    const body: NotificationList = { items, unread: items.filter((n) => !n.read).length };
    return HttpResponse.json(body);
  }),

  http.post(`${BASE}/notifications/read`, async ({ request }) => {
    const { profileId } = (await request.json()) as { profileId?: string };
    const read = readSet();
    for (const n of notificationsFor(profileId ?? "")) read.add(n.notificationId);
    saveRead(read);
    return new HttpResponse(null, { status: 204 });
  }),
];
