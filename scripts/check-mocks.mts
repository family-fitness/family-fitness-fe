/**
 * 목 서버가 도메인 규칙대로 동작하는지 검사한다.
 *
 *   npm run check:mocks
 *
 * AGENTS.md 의 "절대 어기면 안 되는 도메인 규칙" 을 실행 가능한 형태로 옮긴 것이다.
 * 목 데이터를 고치다가 규칙을 깨뜨리면 여기서 잡힌다.
 *
 * 테스트 프레임워크(Vitest)를 붙이는 PR 에서 정식 테스트로 옮긴다.
 */
// MSW 핸들러가 상대 경로(/api/v1/...)로 정의돼 있어서, Node 에는 location 이 없으면
// 매칭이 안 된다. 브라우저와 같은 기준을 만들어 준다.
Object.defineProperty(globalThis, "location", {
  value: new URL("http://localhost/"),
  writable: true,
});

import { setupServer } from "msw/node";
import { handlers, setCurrentProfile } from "@/mocks/handlers";
import { FAMILY_ID, PROFILE_IDS } from "@/mocks/data";

const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: "warn" });

const BASE = "http://localhost/api/v1";
const get = (p: string) => fetch(`${BASE}${p}`);
const post = (p: string, body?: unknown) =>
  fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "통과" : "실패"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}

// 1. 승인 전에는 미션이 0건이다
let missions = await (await get(`/families/${FAMILY_ID}/missions`)).json();
check("승인 전 미션 0건", missions.length === 0, `실제 ${missions.length}건`);

// 2. 자녀 계정은 승인할 수 없다
setCurrentProfile(PROFILE_IDS.hajun);
let res = await post(`/coach/runs/66666666-6666-4666-8666-666666666601/approve`);
let body = await res.json();
check(
  "자녀 계정 승인 차단",
  res.status === 403 && body.code === "PARENT_ROLE_REQUIRED",
  `${res.status} ${body.code}`,
);

// 3. 승인 실패했으니 미션은 여전히 0건이다
missions = await (await get(`/families/${FAMILY_ID}/missions`)).json();
check("차단 후에도 미션 0건", missions.length === 0, `실제 ${missions.length}건`);

// 4. 보호자가 승인하면 미션이 생긴다
setCurrentProfile(PROFILE_IDS.mom);
res = await post(`/coach/runs/66666666-6666-4666-8666-666666666601/approve`);
const run = await res.json();
check(
  "보호자 승인 성공",
  res.status === 200 && run.status === "APPROVED",
  `${res.status} ${run.status}`,
);

missions = await (await get(`/families/${FAMILY_ID}/missions`)).json();
check("승인 후 미션 생성", missions.length === 2, `실제 ${missions.length}건`);

// 5. 중복 승인은 막힌다
res = await post(`/coach/runs/66666666-6666-4666-8666-666666666601/approve`);
body = await res.json();
check(
  "중복 승인 차단",
  res.status === 409 && body.code === "ALREADY_DECIDED",
  `${res.status} ${body.code}`,
);

// 6. 측정 불가 연령은 저장이 막힌다
res = await post(`/profiles/${PROFILE_IDS.seoa}/fitness-tests`, {
  measuredOn: "2026-09-01",
  source: "HOME",
  items: [{ item: "SIT_AND_REACH", value: 5 }],
});
body = await res.json();
check(
  "만 4세 미만 측정 차단",
  res.status === 422 && body.code === "NOT_MEASURABLE_AGE",
  `${res.status} ${body.code}`,
);

// 7. 항목 0개면 저장이 막힌다
res = await post(`/profiles/${PROFILE_IDS.hajun}/fitness-tests`, {
  measuredOn: "2026-09-01",
  source: "HOME",
  items: [],
});
body = await res.json();
check(
  "측정 항목 0개 차단",
  res.status === 400 && body.code === "NO_MEASURED_ITEM",
  `${res.status} ${body.code}`,
);

// 8. 영상 90% 미만은 완료가 아니다
const missionId = missions[0].id;
res = await post(`/missions/${missionId}/progress`, {
  profileId: PROFILE_IDS.hajun,
  verifiedBy: "VIDEO_PROGRESS",
  progressPercent: 62,
});
let mission = await res.json();
let p = mission.participants.find((x: { profileId: string }) => x.profileId === PROFILE_IDS.hajun);
check("영상 62% 는 미완료", p.status === "IN_PROGRESS", p.status);

// 9. 영상 90% 이상은 완료다
res = await post(`/missions/${missionId}/progress`, {
  profileId: PROFILE_IDS.hajun,
  verifiedBy: "VIDEO_PROGRESS",
  progressPercent: 94,
});
mission = await res.json();
p = mission.participants.find((x: { profileId: string }) => x.profileId === PROFILE_IDS.hajun);
check(
  "영상 94% 는 완료",
  p.status === "DONE" && p.verifiedBy === "VIDEO_PROGRESS",
  `${p.status} ${p.verifiedBy}`,
);

// 10. 걸음수 자기신고는 서버가 완료로 올리지 않는다
const mission2 = missions[1];
res = await post(`/missions/${mission2.id}/progress`, {
  profileId: mission2.participants[0].profileId,
  verifiedBy: "SELF_REPORT",
  steps: 9000,
});
mission = await res.json();
p = mission.participants[0];
check(
  "걸음수 자기신고는 미완료 유지",
  p.status === "IN_PROGRESS" && p.verifiedBy === "SELF_REPORT",
  `${p.status} ${p.verifiedBy}`,
);

server.close();
console.log(failed === 0 ? "\n전부 통과" : `\n${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
