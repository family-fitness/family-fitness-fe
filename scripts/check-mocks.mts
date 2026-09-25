/**
 * 목 서버가 도메인 규칙대로 동작하는지 검사한다.
 *
 *   npm run check:mocks
 *
 * AGENTS.md 의 "절대 어기면 안 되는 도메인 규칙" 을 실행 가능한 형태로 옮긴 것이다.
 * 목 데이터를 고치다가 규칙을 깨뜨리면 여기서 잡힌다.
 *
 * 화면이 이 규칙을 지키는지는 별개다 — 그건 브라우저로 눌러 봐야 안다.
 * 여기서 보는 건 "가짜 서버가 진짜 서버처럼 거절하는가" 뿐이다.
 *
 * 테스트 프레임워크를 붙이는 PR 에서 정식 테스트로 옮긴다.
 */

// MSW 핸들러가 상대 경로(/api/v1/...)로 정의돼 있어서, Node 에는 location 이 없으면
// 매칭이 안 된다. 브라우저와 같은 기준을 만들어 준다.
Object.defineProperty(globalThis, "location", {
  value: new URL("http://localhost/"),
  writable: true,
});

import { setupServer } from "msw/node";

import { DEMO, handlers, setActingProfile } from "@/mocks/handlers";
import { streakOf } from "@/mocks/progress";
import { daysBefore } from "@/lib/today";

const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: "warn" });

const BASE = "http://localhost/api/v1";

/** 목 서버도 진짜 서버처럼 토큰을 본다. 화면이 붙이는 것과 같은 머리말이다 */
const SIGNED_IN = { Authorization: "Bearer mock-access-token" };

const get = (path: string) => fetch(`${BASE}${path}`, { headers: SIGNED_IN });
const send = (method: string, path: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...SIGNED_IN },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const post = (path: string, body?: unknown) => send("POST", path, body);

/** 실패 응답은 봉투에 싸여 온다 — {"error":{"code","message"}} */
async function codeOf(res: Response): Promise<string> {
  const body = (await res.json()) as { error?: { code?: string } };
  return body.error?.code ?? "(코드 없음)";
}

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "통과" : "실패"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}

const RUN_ID = "0271ff7b-6e8f-4685-986a-a3a881352cd2";

/**
 * **이번 주 제안에서 태어난** 미션 수.
 *
 * 지난 회차에서 승인한 미션은 목 서버에 이미 들어 있다. 전체를 세면
 * "승인 전 0건" 이 지난주 기록 때문에 깨진다 — 세어야 하는 건 언제나
 * 지금 들여다보고 있는 회차다.
 */
async function missionCount(runId = RUN_ID): Promise<number> {
  const body = (await (await get(`/families/${DEMO.familyId}/missions`)).json()) as {
    missions?: { coachRunId?: string | null }[];
  };
  return (body.missions ?? []).filter((m) => m.coachRunId === runId).length;
}

/* ─── 0. 로그인부터 한다 ────────────────────────────────────── */

check(
  "토큰 없이 들어오면 401",
  (await fetch(`${BASE}/me`)).status === 401,
  `${(await fetch(`${BASE}/me`)).status}`,
);
check(
  "로그인 자체는 토큰 없이 된다",
  (await fetch(`${BASE}/auth/dev-login`, { method: "POST" })).ok,
);

/* ─── 1. 코치 제안은 미션이 아니다 ─────────────────────────── */

check("승인 전 미션 0건", (await missionCount()) === 0, `${await missionCount()}건`);

setActingProfile(DEMO.kid);
let res = await post(`/coach/runs/${RUN_ID}/approve`);
check("자녀 계정 승인 차단", res.status === 403, `${res.status} ${await codeOf(res)}`);

check("차단 후에도 미션 0건", (await missionCount()) === 0);

setActingProfile(DEMO.mom);
res = await post(`/coach/runs/${RUN_ID}/approve`);
check("보호자 승인 성공", res.status === 200, String(res.status));

const created = await missionCount();
check("승인해야 미션이 생긴다", created > 0, `${created}건`);

res = await post(`/coach/runs/${RUN_ID}/approve`);
check("중복 승인 차단", res.status === 409, `${res.status} ${await codeOf(res)}`);

/* ─── 2. 측정 거절 규칙 ────────────────────────────────────── */

const today = new Date().toISOString().slice(0, 10);

res = await post(`/profiles/${DEMO.kid}/fitness-tests`, {
  testedOn: today,
  source: "SELF_INPUT",
  items: [],
});
check("측정 항목 0개 차단", res.status === 400 && (await codeOf(res)) === "NO_ITEMS");

res = await post(`/profiles/${DEMO.kid}/fitness-tests`, {
  testedOn: today,
  source: "SELF_INPUT",
  // 005 · 006 은 혈압이다. 입력으로 받지 않는다
  items: [{ itemCode: "005", value: 120 }],
});
check("혈압 항목 차단", res.status === 400 && (await codeOf(res)) === "ITEM_NOT_ALLOWED");

// 만 4세 미만은 국민체력100 규준 자체가 없다
const babyRes = await post(`/families/${DEMO.familyId}/profiles`, {
  name: "막내",
  birthDate: `${new Date().getFullYear() - 2}-01-01`,
  sex: "F",
  role: "CHILD",
  guardianConsent: { personalData: true, healthData: true },
});
const baby = (await babyRes.json()) as { profileId?: string; measurable?: boolean };
check("만 4세 미만도 프로필은 생긴다", babyRes.status === 201, String(babyRes.status));
check("만 4세 미만은 measurable=false", baby.measurable === false, String(baby.measurable));

res = await post(`/profiles/${baby.profileId}/fitness-tests`, {
  testedOn: today,
  source: "SELF_INPUT",
  items: [{ itemCode: "012", value: 5 }],
});
check("만 4세 미만 측정 차단", res.status === 422 && (await codeOf(res)) === "NOT_MEASURABLE");

// 서버가 동의를 자동으로 찍지 않는다
res = await post(`/families/${DEMO.familyId}/profiles`, {
  name: "동의없는아이",
  birthDate: `${new Date().getFullYear() - 9}-01-01`,
  sex: "M",
  role: "CHILD",
});
check(
  "동의 없는 미성년 프로필 차단",
  res.status === 422 && (await codeOf(res)) === "CONSENT_REQUIRED",
);

/* ─── 3. 서버가 아는 것과 사람이 적은 것 ───────────────────── */

const missions = (await (await get(`/families/${DEMO.familyId}/missions`)).json()) as {
  missions: { missionId: string }[];
};
const missionId = missions.missions[0].missionId;

const timer = (await (
  await post(`/missions/${missionId}/activity/timer`, {
    profileId: DEMO.kid,
    startedAt: `${today}T10:00:00Z`,
    endedAt: `${today}T10:50:00Z`,
    activeMinutes: 50,
  })
).json()) as { serverVerified?: boolean; missionCompleted?: boolean };
check("타이머는 서버가 확인한다", timer.serverVerified === true);
check("타이머로 목표 도달 시 완료", timer.missionCompleted === true);

const steps = (await (
  await post(`/missions/${missionId}/activity/steps`, {
    profileId: DEMO.kid,
    activityDate: today,
    steps: 12000,
  })
).json()) as { serverVerified?: boolean; missionCompleted?: boolean; needsGuardianCheck?: boolean };
check("걸음수는 서버가 확인하지 못한다", steps.serverVerified === false);
check("걸음수는 목표를 넘겨도 미완료", steps.missionCompleted === false);
check("걸음수는 보호자 확인이 남는다", steps.needsGuardianCheck === true);

/* ─── 4. 영상 ──────────────────────────────────────────────── */

const VIDEO = "IdpXx2gm90o";
let progress = (await (
  await post(`/videos/${VIDEO}/progress`, { profileId: DEMO.kid, progress: 0.5, watchedSec: 300 })
).json()) as { creditedMinutes?: number; verifiedBy?: string | null };
check("50퍼센트는 적립하지 않는다", progress.creditedMinutes === 0);
check("50퍼센트는 확인으로 치지 않는다", progress.verifiedBy === null);

progress = (await (
  await post(`/videos/${VIDEO}/progress`, { profileId: DEMO.kid, progress: 0.95, watchedSec: 570 })
).json()) as { creditedMinutes?: number; verifiedBy?: string | null };
check("처음 90퍼센트를 넘으면 적립", (progress.creditedMinutes ?? 0) > 0);
check("완주는 영상으로 확인된다", progress.verifiedBy === "VIDEO_PROGRESS");

progress = (await (
  await post(`/videos/${VIDEO}/progress`, { profileId: DEMO.kid, progress: 1, watchedSec: 600 })
).json()) as { creditedMinutes?: number };
check("두 번 적립되지 않는다", progress.creditedMinutes === 0);

// 라벨 연령과 겹치지 않는 영상은 내려오지 않는다
const kidVideos = (await (
  await get(`/videos?ageGroup=${encodeURIComponent("유아기")}`)
).json()) as {
  videos: { label?: { ageFrom?: number | null; ageTo?: number | null } }[];
};
check(
  "영상 연령 안전 필터",
  kidVideos.videos.every((v) => (v.label?.ageFrom ?? 99) <= 6),
  `${kidVideos.videos.length}건`,
);
check(
  "라벨 없는 영상은 아이에게 안 나간다",
  kidVideos.videos.every((v) => v.label?.ageFrom != null || v.label?.ageTo != null),
);

/* ─── 5. 동의 철회 ─────────────────────────────────────────── */

const revoked = (await (
  await send("PATCH", `/profiles/${DEMO.kid}/consent`, {
    personalData: false,
    healthData: false,
  })
).json()) as { consentGiven?: boolean; measurable?: boolean };
check("동의를 철회하면 측정할 수 없게 된다", revoked.measurable === false);

res = await post(`/profiles/${DEMO.kid}/fitness-tests`, {
  testedOn: today,
  source: "SELF_INPUT",
  items: [{ itemCode: "012", value: 8 }],
});
check("동의 철회 후 측정 차단", res.status === 422 && (await codeOf(res)) === "CONSENT_REQUIRED");

/* ─── 6. 쉬는 날 · 이어서 한 날 · 리그 ─────────────────────── */

// 쉬는 날은 건너서 잇는다 — 끊지도 않고 더하지도 않는다(규칙 15)
const [d0, d1, d2, d3] = [0, 1, 2, 3].map((n) => daysBefore(n));
check("오늘 아직이면 어제부터 센다", streakOf(new Set([d1, d2]), new Set()) === 2);
check(
  "쉬는 날은 사이를 잇고 수에 더하지 않는다",
  streakOf(new Set([d1, d3]), new Set([d2])) === 2,
  `${streakOf(new Set([d1, d3]), new Set([d2]))}`,
);
check("쉬는 날만으로는 이어서 한 날이 생기지 않는다", streakOf(new Set(), new Set([d0, d1])) === 0);

type League = { tier: string; rate: number | null; rank: number | null };
const demoLeague = (await (await get(`/families/${DEMO.familyId}/league`)).json()) as League;
check(
  "시연 가족 리그 — 달성률 · 순위가 있다",
  demoLeague.rate != null &&
    demoLeague.rate >= 0 &&
    demoLeague.rate <= 100 &&
    demoLeague.rank != null,
  `${demoLeague.tier} ${demoLeague.rate}% ${demoLeague.rank}등`,
);

// 새 가족 — 브론즈에서, 셀 날이 없으면 달성률 · 순위가 비어 있다(0% · 꼴찌가 아니다)
await post("/auth/dev-login", { providerUserId: "demo-fresh" });
const freshFamily = (await (
  await post("/families", {
    familyName: "검사네",
    owner: { name: "검사", birthDate: "1988-01-01", sex: "F" },
  })
).json()) as { familyId?: string };
const fresh = (await (await get(`/families/${freshFamily.familyId}/league`)).json()) as League;
check("새 가족은 브론즈에서 시작한다", fresh.tier === "BRONZE", fresh.tier);
check(
  "셀 날이 없으면 달성률 · 순위가 비어 있다",
  fresh.rate === null && fresh.rank === null,
  `${fresh.rate} · ${fresh.rank}`,
);

server.close();
console.log(failed === 0 ? "\n전부 통과" : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
