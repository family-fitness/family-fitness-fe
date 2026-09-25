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

/* ─── 3. 한 칸 끝 — 끝낸 칸은 사람마다 ─────────────────────── */

type Participant = {
  profileId: string;
  completed?: boolean;
  needsGuardianCheck?: boolean;
  verifiedBy?: string | null;
  doneSessions?: number[];
};
type MissionBody = { missionId: string; participants: Participant[] };

const sibling = (await (
  await post(`/families/${DEMO.familyId}/profiles`, {
    name: "둘째",
    birthDate: `${new Date().getFullYear() - 8}-03-01`,
    sex: "F",
    role: "CHILD",
    guardianConsent: { personalData: true, healthData: true },
  })
).json()) as { profileId: string };

// 형제 둘이 같은 운동을 받는다(직접 짜기에서 여럿을 고를 수 있다)
const shared = (await (
  await post(`/families/${DEMO.familyId}/missions`, {
    title: "둘이 같이",
    startDate: today,
    endDate: today,
    targetMetric: "TIMER_MINUTES",
    targetValue: 2,
    participantProfileIds: [DEMO.kid, sibling.profileId],
    sessions: [
      { position: 1, phase: "WARMUP", title: "준비", minutes: 1, completed: true },
      { position: 2, phase: "MAIN", title: "본", minutes: 1 },
    ],
  })
).json()) as MissionBody;
const partsOf = async (id: string) =>
  (
    (await (await get(`/families/${DEMO.familyId}/missions`)).json()) as {
      missions: MissionBody[];
    }
  ).missions.find((m) => m.missionId === id)?.participants ?? [];
const who = (list: Participant[], id: string) => list.find((p) => p.profileId === id);

check(
  "보낸 쪽이 칸에 적어 온 끝냄은 믿지 않는다",
  (who(await partsOf(shared.missionId), DEMO.kid)?.doneSessions ?? []).length === 0,
);

const xpOf = async (id: string) =>
  ((await (await get(`/profiles/${id}/progress`)).json()) as { xp: number }).xp;
const before = await xpOf(DEMO.kid);
const done = { profileId: DEMO.kid, activeSeconds: 60, startedAt: today, endedAt: today };
const first = (await (
  await post(`/missions/${shared.missionId}/sessions/1/done`, done)
).json()) as { xpGained?: number; missionCompleted?: boolean; verifiedBy?: string };
check("한 칸 끝은 타이머로 확인된다", first.verifiedBy === "TIMER");
check("한 칸만 끝내면 아직 다 한 것이 아니다", first.missionCompleted === false);
check(
  "받은 경험치는 레벨이 센 만큼과 같다",
  (first.xpGained ?? 0) > 0 && (await xpOf(DEMO.kid)) - before === first.xpGained,
  `+${first.xpGained} / ${(await xpOf(DEMO.kid)) - before}`,
);

let parts = await partsOf(shared.missionId);
check("끝낸 아이에게 그 칸이 남는다", (who(parts, DEMO.kid)?.doneSessions ?? []).includes(1));
check(
  "형제에게는 끝난 칸이 아니다",
  (who(parts, sibling.profileId)?.doneSessions ?? []).length === 0 &&
    !who(parts, sibling.profileId)?.completed,
);
const siblingDay = (await (
  await get(
    `/families/${DEMO.familyId}/calendar?profileId=${sibling.profileId}&from=${today}&to=${today}`,
  )
).json()) as { days: { minutes: number }[] };
check("형제의 오늘은 0분이다", (siblingDay.days[0]?.minutes ?? 0) === 0);

const again = (await (
  await post(`/missions/${shared.missionId}/sessions/1/done`, done)
).json()) as { xpGained?: number };
check("같은 칸을 두 번 끝내도 두 번 쌓이지 않는다", again.xpGained === 0, `+${again.xpGained}`);

res = await post(`/missions/${shared.missionId}/sessions/2/done`, { ...done, activeSeconds: 10 });
check("잡힌 시간의 절반도 안 했으면 끝이 아니다", (await codeOf(res)) === "TOO_SHORT");

res = await post(`/missions/${shared.missionId}/sessions/2/done`, { ...done, profileId: DEMO.dad });
check("참여자가 아니면 끝낼 수 없다", (await codeOf(res)) === "NOT_A_PARTICIPANT");

const last = (await (await post(`/missions/${shared.missionId}/sessions/2/done`, done)).json()) as {
  missionCompleted?: boolean;
};
parts = await partsOf(shared.missionId);
check(
  "다 끝낸 아이만 다 한 것이다",
  last.missionCompleted === true &&
    who(parts, DEMO.kid)?.completed === true &&
    !who(parts, sibling.profileId)?.completed,
);

// 아이와 같이 하는 보호자 둘 — 아이가 끝낸 칸은 같이 끝나고, 보호자가 끝낸 칸은 그 보호자 것뿐이다
const together = (await (
  await post(`/families/${DEMO.familyId}/missions`, {
    title: "엄마랑 같이",
    startDate: today,
    endDate: today,
    targetMetric: "TIMER_MINUTES",
    targetValue: 2,
    participantProfileIds: [DEMO.kid, DEMO.mom, DEMO.dad],
    sessions: [
      { position: 1, phase: "MAIN", title: "하나", minutes: 1 },
      { position: 2, phase: "MAIN", title: "둘", minutes: 1 },
    ],
  })
).json()) as MissionBody;
await post(`/missions/${together.missionId}/sessions/1/done`, done);
await post(`/missions/${together.missionId}/sessions/2/done`, { ...done, profileId: DEMO.mom });
parts = await partsOf(together.missionId);
check(
  "아이가 끝낸 칸은 같이 하는 보호자에게도 끝난 칸이다",
  (who(parts, DEMO.mom)?.doneSessions ?? []).includes(1) &&
    (who(parts, DEMO.dad)?.doneSessions ?? []).includes(1),
);
check(
  "보호자가 끝낸 칸은 아이 · 다른 보호자에게 번지지 않는다",
  !(who(parts, DEMO.kid)?.doneSessions ?? []).includes(2) &&
    !(who(parts, DEMO.dad)?.doneSessions ?? []).includes(2),
  `아이 ${JSON.stringify(who(parts, DEMO.kid)?.doneSessions)} · 아빠 ${JSON.stringify(who(parts, DEMO.dad)?.doneSessions)}`,
);

/* ─── 4. 사람이 적은 것은 보호자가 확인한다(규칙 2) ─────────── */

const reported = (await (
  await get(`/families/${DEMO.familyId}/calendar?profileId=${DEMO.kid}&from=${today}&to=${today}`)
).json()) as {
  days: { entries: { missionId: string; verifiedBy: string | null; minutes: number }[] }[];
};
const steps = reported.days[0]?.entries.find((e) => e.missionId === "seed-steps");
check(
  "직접 적은 걸음수는 자기 신고이고 분으로 세지 않는다",
  steps?.verifiedBy === "SELF_REPORT" && steps.minutes === 0,
);

setActingProfile(DEMO.kid);
res = await post(`/missions/seed-steps/participants/${DEMO.kid}/confirm`);
check("아이는 스스로 확인할 수 없다", res.status === 403);
setActingProfile(DEMO.mom);
res = await post(`/missions/seed-steps/participants/${DEMO.kid}/confirm`);
parts = await partsOf("seed-steps");
check(
  "보호자가 확인하면 완료가 된다",
  res.ok && who(parts, DEMO.kid)?.completed === true && !who(parts, DEMO.kid)?.needsGuardianCheck,
);
res = await post(`/missions/없는-미션/participants/${DEMO.kid}/confirm`);
check("없는 운동은 확인할 수 없다", res.status === 404);

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

res = await post(`/missions/${shared.missionId}/sessions/1/done`, done);
check("동의 철회 후 운동 기록도 차단", (await codeOf(res)) === "CONSENT_REQUIRED");

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
