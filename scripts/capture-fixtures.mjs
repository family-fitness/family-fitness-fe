/**
 * 실제 백엔드 응답을 목 데이터로 굳힌다.
 *
 *   (백엔드) ./gradlew bootRun
 *   npm run api:fixtures
 *
 * 목 데이터를 손으로 지어내면 필드명이 어긋나고, 그 어긋남은 화면을 다 만든 뒤에야
 * 드러난다. 실제 응답을 그대로 쓰면 그 일이 없다.
 */
import { writeFile } from "node:fs/promises";

const BASE = process.env.BACKEND ?? "http://localhost:8080/api/v1";
const FAMILY = "00000000-0000-4000-8000-000000000010";
const MOM = "00000000-0000-4000-8000-000000000011";
const KID = "00000000-0000-4000-8000-000000000012";

const get = async (path) => {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
};
const post = async (path, body = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
};

const enc = encodeURIComponent;

// 코치 실행은 비동기다. AWAITING_APPROVAL 이 될 때까지 기다린다
const started = await post(`/families/${FAMILY}/coach/runs`);
let coachRun = await get(`/coach/runs/${started.coachRunId}`);
for (let i = 0; i < 20 && coachRun.status === "RUNNING"; i += 1) {
  await new Promise((r) => setTimeout(r, 1000));
  coachRun = await get(`/coach/runs/${started.coachRunId}`);
}

const coachApprove = await post(`/coach/runs/${started.coachRunId}/approve`);

const fixtures = {
  me: await get("/me"),
  profiles: await get(`/families/${FAMILY}/profiles`),
  fitnessMap: await get(`/families/${FAMILY}/fitness-map`),
  itemsByAgeGroup: {
    유아기: await get(`/fitness/items?ageGroup=${enc("유아기")}`),
    유소년: await get(`/fitness/items?ageGroup=${enc("유소년")}`),
    성인: await get(`/fitness/items?ageGroup=${enc("성인")}`),
  },
  latestByProfile: {
    [KID]: await get(`/profiles/${KID}/fitness-tests/latest`),
    [MOM]: await get(`/profiles/${MOM}/fitness-tests/latest`),
  },
  coachRun,
  coachApprove,
  missionsAfterApproval: await get(`/families/${FAMILY}/missions`),
  videos: await get("/videos?list=ALL&size=20"),
  report: await get(`/families/${FAMILY}/report/weekly`),
  prediction: await post(`/profiles/${KID}/predictions`),
};

await writeFile("src/mocks/fixtures.json", JSON.stringify(fixtures, null, 2) + "\n");
console.log(
  `fixtures.json 갱신 — 코치 실행 ${coachRun.status} · 미션 ${fixtures.missionsAfterApproval.missions.length}건`,
);
