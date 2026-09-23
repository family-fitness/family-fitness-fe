/**
 * 가족 한 바퀴 — 아이가 운동을 마치면 부모에게 알림이 가고, 부모가 스티커를 붙이면
 * 아이에게 알림이 가고 그날 캘린더에 붙는다. 이 서비스의 순환이 목 서버로 끝까지 도는지 본다.
 *
 * 목 서버의 기록은 탭의 sessionStorage 에 산다 — 부모 · 아이를 같은 탭에서 역할만
 * 바꿔 가며 돈다(부모 폰을 아이가 빌려 쓰는 것과 같다).
 *
 *   node scripts/check-loop.mjs      (개발 서버 3001 이 떠 있어야 한다)
 */
import { chromium } from "playwright";

const B = "http://localhost:3001";
const KID = "00000000-0000-4000-8000-000000000012";
const HIDE = `nextjs-portal, [data-nextjs-toast], .tsqd-parent-container { display:none !important; }`;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(() => {
  if (!localStorage.getItem("ff-auth"))
    localStorage.setItem(
      "ff-auth",
      JSON.stringify({
        state: { accessToken: "mock-access-token", refreshToken: "r" },
        version: 0,
      }),
    );
});
// 유튜브는 막는다. 없어도 타이머로 끝까지 가야 한다
await context.route(/youtube\.com|ytimg\.com/, (route) => route.abort());

const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => {
  const line = String(e).split("\n")[0];
  // 막아 둔 영상 칸이 localStorage 를 읽으려다 내는 소리 — 우리 코드가 아니다
  if (!/localStorage.*Access is denied/.test(line)) errors.push(line);
});

const problems = [];
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`통과  ${name}`);
  } catch (e) {
    problems.push(`${name} — ${String(e).split("\n")[0]}`);
    console.log(`실패  ${name}`);
  }
};

/** 같은 탭에서 역할만 바꾼다 */
const become = async (mode, path) => {
  await page.evaluate(
    ([m, kid]) =>
      localStorage.setItem(
        "ff-role",
        JSON.stringify({ state: { mode: m, childProfileId: kid }, version: 0 }),
      ),
    [mode, KID],
  );
  await page.goto(B + path, { waitUntil: "load" });
  await page.addStyleTag({ content: HIDE }).catch(() => {});
};

await page.clock.install();
await page.goto(B + "/", { waitUntil: "load" });

// 1. 아이 — 오늘 운동을 끝까지 하고 알린다
await become("kid", "/kid/m/seed-today");
await step("아이가 오늘 운동을 시작한다", async () => {
  await page.getByRole("button", { name: "시작하기" }).click({ timeout: 20000 });
});
for (const minutes of [4, 4, 1, 1]) {
  await page.clock.runFor(minutes * 60 * 1000 + 600);
  await page.clock.runFor(10500);
}
await step("다 하면 엄마 · 아빠한테 알린다", async () => {
  await page.getByRole("button", { name: "엄마 · 아빠한테 알리기" }).click({ timeout: 8000 });
  await page.getByText(/알렸어요/).waitFor({ timeout: 5000 });
});
await page.clock.resume();

// 2. 부모 — 종에 점, 알림을 누르면 스티커 붙이기로
await become("parent", "/parent");
await step("부모 종에 새 알림 점이 뜬다", async () => {
  await page.getByRole("link", { name: "알림 · 새로 온 것 있음" }).waitFor({ timeout: 10000 });
});
await step("알림에 아이가 마쳤다는 말이 있다", async () => {
  await page.getByRole("link", { name: "알림 · 새로 온 것 있음" }).click();
  await page
    .getByText(/서준이 운동을 마쳤어요/)
    .first()
    .waitFor({ timeout: 8000 });
});
await step("알림을 누르면 스티커 붙이기로 간다", async () => {
  await page
    .getByText(/서준이 운동을 마쳤어요/)
    .first()
    .click();
  await page.waitForURL(/\/parent\/sticker\//, { timeout: 8000 });
});
await step("스티커를 고르기만 해도 붙는다", async () => {
  await page.getByRole("button", { name: /최고야/ }).click({ timeout: 8000 });
  await page.getByRole("button", { name: "최고야 붙이기" }).click();
  await page.getByRole("heading", { name: "붙였어요" }).waitFor({ timeout: 8000 });
});

// 3. 아이 — 스티커 알림, 누르면 캘린더 그날에 붙어 있다
await become("kid", "/kid");
await step("아이 종에 새 알림 점이 뜬다", async () => {
  await page.getByRole("link", { name: "알림 · 새로 온 것 있음" }).waitFor({ timeout: 10000 });
});
await step("알림에 엄마가 스티커를 붙여 줬다는 말이 있다(이름이 아니라 엄마)", async () => {
  await page.getByRole("link", { name: "알림 · 새로 온 것 있음" }).click();
  await page.getByText("엄마가 스티커를 붙여 줬어요").first().waitFor({ timeout: 8000 });
});
await step("누르면 캘린더 오늘 칸에 그 스티커가 있다", async () => {
  await page.getByText("엄마가 스티커를 붙여 줬어요").first().click();
  await page.waitForURL(/\/calendar/, { timeout: 8000 });
  await page.getByText("최고야").first().waitFor({ timeout: 8000 });
});
await step("스티커만큼 경험치가 들어왔다", async () => {
  await page.goto(B + "/kid/badges", { waitUntil: "load" });
  await page
    .getByText(/엄마가 붙여 준 스티커/)
    .first()
    .waitFor({ timeout: 8000 });
});

await browser.close();

if (errors.length) problems.push(...[...new Set(errors)].map((e) => `터짐: ${e}`));
if (problems.length) {
  console.log("\n문제:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("\n가족 한 바퀴 이상 없음");
