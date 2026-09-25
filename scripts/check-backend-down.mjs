/**
 * 백엔드가 죽었을 때 화면이 뭐라고 하는지 본다.
 *
 *   NEXT_PUBLIC_API_MOCKING=off npm run build
 *   npx next start -p 3005
 *   npm run check:down
 *
 * 목 서버를 켜 두면 MSW 가 요청을 먼저 잡아서 이 검사가 헛돈다.
 * 그래서 목을 끈 빌드에 대고 돌린다.
 *
 * 잡으려는 것은 "못 불러온 것을 없는 것으로 그리는" 버그다.
 * 서버가 죽었는데 부모에게 "그런 아이는 없습니다" 라고 말하면 안 된다.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const B = "http://localhost:3005";
const KID = "00000000-0000-4000-8000-000000000012";
// 로그인만 살려 둔다. 그래야 로그인 화면으로 튕기지 않고 각 화면의 실패 처리를 본다
const ME = JSON.stringify(
  JSON.parse(readFileSync(new URL("../src/mocks/fixtures.json", import.meta.url), "utf8")).me,
);
/**
 * 실패를 말하지 않아도 되는 화면 — /me 로 이미 받은 값만 그린다.
 * 참여 방식은 **고른 순간** 저장에 실패하면 그때 말해 준다 — 열자마자 경고를 띄울 이유가 없다.
 */
const SILENT_OK = new Set(["/settings", "/settings/support-mode"]);

/** 실패를 말하는 말 — 화면마다 쓰는 오류 문구 */
const SAYS = /불러오지 못했|못 불러왔|연결이 어려워|점검/;
/** 못 받은 것을 없는 것으로 그리는 말 — 서버가 죽었는데 이렇게 말하면 거짓말이다 */
const LIES =
  /아직 오늘 운동이 없어요|오늘 운동이 아직 없어요|찾을 수 없는|동의가 필요한 가족이 없어요|조건에 맞는 동작이 없어요|아직 재지 않았어요|오늘 운동 없어요/;

const ROUTES = [
  "/parent",
  "/parent/family",
  "/parent/dashboard",
  "/parent/league",
  `/parent/child/${KID}`,
  "/kid",
  "/kid/m/seed-today",
  "/kid/badges",
  "/calendar",
  "/calendar/2026-09-23",
  "/notifications",
  "/plan",
  "/plan/custom",
  `/parent/sticker/${KID}`,
  "/videos",
  "/settings",
  "/settings/support-mode",
  "/settings/consent",
  "/settings/schedule",
  `/p/${KID}/measure`,
  `/p/${KID}/result`,
  `/p/${KID}/future`,
];

const reachable = await fetch(B)
  .then(() => true)
  .catch(() => false);
if (!reachable) {
  console.error(
    `${B} 가 안 떠 있다. 먼저 목을 끈 빌드를 띄운다:\n  NEXT_PUBLIC_API_MOCKING=off npm run build && npx next start -p 3005`,
  );
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(
  ([kid]) => {
    const mode = location.pathname.startsWith("/kid") ? "kid" : "parent";
    localStorage.setItem(
      "ff-role",
      JSON.stringify({ state: { mode, childProfileId: kid }, version: 0 }),
    );
    localStorage.setItem(
      "ff-auth",
      JSON.stringify({ state: { accessToken: "t", refreshToken: "r" }, version: 0 }),
    );
    // 직접 짜기에 동작 하나를 담아 둔다 — 비어 있으면 이 기기의 쟁반만 그려 서버를 부를 일이 없다.
    // 담은 뒤에야 「누가 할까요」 가 가족을 부른다
    sessionStorage.setItem(
      "ff-routine",
      JSON.stringify({
        state: {
          moves: [
            {
              clip: {
                clipId: "down-1",
                videoId: "A1CDVFUc_oU",
                startSec: 0,
                endSec: 60,
                title: "스쿼트",
                factor: "근력",
                phase: "MAIN",
                homeOk: true,
                quiet: true,
                props: false,
              },
              minutes: 2,
            },
          ],
        },
        version: 0,
      }),
    );
  },
  [KID],
);

await ctx.route("**/api/v1/**", (route) => {
  const p = new URL(route.request().url()).pathname;
  if (p.endsWith("/me"))
    return route.fulfill({ status: 200, contentType: "application/json", body: ME });
  return route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "TEMPORARILY_UNAVAILABLE", message: "서버 점검" } }),
  });
});

const bad = [];

for (const r of ROUTES) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => bad.push(`${r} — 터짐: ` + String(e).split("\n")[0].slice(0, 90)));
  await page.goto(B + r, { waitUntil: "load" });
  await page.waitForTimeout(16000); // 재시도가 끝날 때까지
  const text = (await page.locator("body").innerText()).replace(/\n+/g, " | ").trim();
  const lie = text.match(LIES)?.[0];
  const verdict =
    text.length < 6
      ? "빈 화면인 채로 멈춤"
      : lie
        ? `없는 것으로 그림: 「${lie}」`
        : SAYS.test(text)
          ? null
          : "말 없음: " + text.slice(0, 70);
  if (verdict && (lie || !SILENT_OK.has(r))) bad.push(`${r} — ${verdict}`);
  console.log(
    `${r.padEnd(44)} ${verdict ?? "말해 줌"}${SILENT_OK.has(r) && verdict && !lie ? " (봐줌)" : ""}`,
  );
  await page.close();
}
await browser.close();

if (bad.length > 0) {
  console.error(`\n서버가 죽었을 때 말해 주지 않는 화면 ${bad.length}개`);
  process.exit(1);
}
console.log("\n서버가 죽어도 화면마다 말해 준다");
