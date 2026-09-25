/**
 * 가족 리그 · 쉬는 날 카드.
 *
 * ▲ 서버에 아직 없다(`BACKEND_ASKS.md`). 목이 제안한 모양으로 답한다.
 *
 * 리그의 다른 가족들은 **목에만 있는 가족**이다(시연용). 우리 가족의 달성률만 실제 기록으로 센다 —
 * 아이마다 이번 달 잡힌 날 중 운동을 해낸 날의 비율(쉬는 날 뺌)을 내고 평균한다. 식구 수와 상관없고,
 * 체력이 아니라 한 만큼이다. 잡힌 날은 그 아이에게 운동이 등록된 날이다(시연 가족은 지난 기록이 있어
 * 운동할 수 있는 요일로 센다). 지난 날을 전부 세면 이번 달 중간에 들어온 가족이 첫날 운동을 하고도
 * 4% 로 꼴찌가 된다(9/25 한 바퀴). 셀 날이 없으면 달성률은 비어 있다(null) — 0% 가 아니다.
 */
import { HttpResponse, http, type PathParams } from "msw";

import type { FamilyLeague, RestDays } from "@/lib/api/types";
import { daysBefore, monthOf, today, weekdayCode } from "@/lib/today";

import { BASE, db, fail, saveRestDays } from "./db";
import { dayLogFor, hasHistory } from "./history";

/** 한 달에 주는 쉬는 날 카드 */
const REST_PER_MONTH = 2;

/** 한 리그 묶음에서 올라가고 내려가는 자리 수 */
const MOVE = 3;

/** 목에만 있는 이웃 가족들. 티어마다 달성률 결이 조금씩 다르다 */
const NEIGHBORS = [
  "민준이네",
  "하윤이네",
  "서연이네",
  "지호네",
  "예린이네",
  "도윤이네",
  "아린이네",
  "시우네",
  "채원이네",
];
const BASE_RATE: Record<FamilyLeague["tier"], number> = {
  BRONZE: 48,
  SILVER: 58,
  GOLD: 68,
  PLATINUM: 76,
  DIAMOND: 84,
};

/** 이번 달 1일부터 날짜 목록 */
function monthDates(until: string): string[] {
  const month = monthOf(until);
  const out: string[] = [];
  for (let back = 0; back < 31; back++) {
    const d = daysBefore(back, until);
    if (monthOf(d) !== month) break;
    out.push(d);
  }
  return out.reverse();
}

/** 이 달 마지막 날까지 남은 날 */
function daysLeftIn(date: string): number {
  const [y, m] = date.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return last - Number(date.slice(8));
}

/** 그날 이 아이에게 운동이 잡혀 있었나 — 등록된 운동(걸음수 뺌). 시연 가족은 운동할 수 있는 요일도 */
function planned(profileId: string, date: string): boolean {
  const registered = db.missions.some(
    (m) =>
      m.targetMetric !== "STEPS" &&
      (m.startDate ?? "") <= date &&
      date <= (m.endDate ?? "") &&
      m.participants?.some((p) => p.profileId === profileId),
  );
  if (registered) return true;
  if (!hasHistory(profileId)) return false;
  return (db.availability[profileId] ?? []).some((slot) => slot.day === weekdayCode(date));
}

/** 우리 가족의 이번 달 달성률(%) — 아이마다 (해낸 날 ÷ 잡힌 날, 쉬는 날 뺌) 의 평균. 셀 날이 없으면 null */
function familyRate(): number | null {
  const now = today();
  const kids = (db.profiles.profiles ?? []).filter((p) => p.role === "CHILD");
  const rest = new Set(db.restDays);
  const rates = kids.flatMap((kid) => {
    const id = kid.profileId ?? "";
    const moved = (d: string) => (dayLogFor(id, d)?.minutes ?? 0) > 0;
    // 오늘은 아직 하는 중이다 — 오늘 해냈으면 세고, 아직이면 빼고 센다
    const counted = monthDates(now).filter(
      (d) => !rest.has(d) && planned(id, d) && (d < now || moved(d)),
    );
    // 셀 날이 없는 아이는 평균에 넣지 않는다 — 0 으로 세면 식구 수가 불리해진다
    if (counted.length === 0) return [];
    return [counted.filter(moved).length / counted.length];
  });
  if (rates.length === 0) return null;
  return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100);
}

function leagueOf(month: string): FamilyLeague {
  const tier = db.leagueTier;
  const mine = familyRate();
  // 이웃 가족의 달성률은 이름과 달로 정해진다 — 새로고침마다 순위가 뒤섞이지 않게
  const others = NEIGHBORS.map((name, i) => {
    const wobble = ((name.charCodeAt(0) + i * 7 + Number(month.slice(5))) % 29) - 14;
    return {
      familyName: name,
      rate: Math.max(5, Math.min(100, BASE_RATE[tier] + wobble)),
      me: false,
    };
  });
  // 달성률이 아직 없는 집은 맨 아래 — 순위를 매기지 않는다
  const standings: FamilyLeague["standings"] = [
    ...others,
    { familyName: db.profiles.familyName ?? "우리 가족", rate: mine, me: true },
  ].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || (a.me ? -1 : b.me ? 1 : 0));
  const rank = mine == null ? null : standings.findIndex((s) => s.me) + 1;
  return {
    month,
    tier,
    rate: mine,
    rank,
    groupSize: standings.length,
    promote: tier === "DIAMOND" ? 0 : MOVE,
    demote: tier === "BRONZE" ? 0 : MOVE,
    daysLeft: daysLeftIn(today()),
    standings,
  };
}

function restOf(month: string): RestDays {
  const days = db.restDays.filter((d) => monthOf(d) === month).sort();
  return { month, perMonth: REST_PER_MONTH, left: Math.max(0, REST_PER_MONTH - days.length), days };
}

export const league = [
  http.get<PathParams>(`${BASE}/families/:familyId/league`, ({ request }) => {
    const month = new URL(request.url).searchParams.get("month") ?? monthOf(today());
    return HttpResponse.json<FamilyLeague>(leagueOf(month));
  }),

  http.get<PathParams>(`${BASE}/families/:familyId/rest-days`, ({ request }) => {
    const month = new URL(request.url).searchParams.get("month") ?? monthOf(today());
    return HttpResponse.json<RestDays>(restOf(month));
  }),

  /** 쉬는 날 카드 쓰기. 지난 날에는 못 쓴다 — 빈 날을 나중에 덮으면 카드가 핑계가 된다 */
  http.post<PathParams>(`${BASE}/families/:familyId/rest-days`, async ({ request }) => {
    const { date } = (await request.json().catch(() => ({}))) as { date?: string };
    const now = today();
    if (
      !date ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date < now ||
      monthOf(date) !== monthOf(now)
    ) {
      return fail(422, "INVALID_DATE", "이번 달 오늘부터만 쓸 수 있습니다");
    }
    if (db.restDays.includes(date)) {
      return fail(409, "ALREADY_REST_DAY", "이미 쉬는 날입니다");
    }
    if (restOf(monthOf(date)).left === 0) {
      return fail(409, "NO_REST_CARD_LEFT", "이번 달 카드를 다 썼습니다");
    }
    const kids = (db.profiles.profiles ?? []).filter((p) => p.role === "CHILD");
    if (kids.some((k) => (dayLogFor(k.profileId ?? "", date)?.minutes ?? 0) > 0)) {
      return fail(422, "ALREADY_MOVED", "이미 운동한 날입니다");
    }
    db.restDays = [...db.restDays, date];
    saveRestDays();
    return HttpResponse.json<RestDays>(restOf(monthOf(date)), { status: 201 });
  }),

  /** 쉬는 날 되돌리기 — 오늘이나 앞날만. 카드는 돌려준다 */
  http.delete<PathParams>(`${BASE}/families/:familyId/rest-days/:date`, ({ params }) => {
    const date = String(params.date);
    if (date < today()) return fail(422, "INVALID_DATE", "지난 날은 되돌릴 수 없습니다");
    if (!db.restDays.includes(date)) return fail(404, "NOT_REST_DAY", "쉬는 날이 아닙니다");
    db.restDays = db.restDays.filter((d) => d !== date);
    saveRestDays();
    return HttpResponse.json<RestDays>(restOf(monthOf(date)));
  }),
];
