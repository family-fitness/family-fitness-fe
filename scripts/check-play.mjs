/**
 * 운동하기 화면을 끝까지 따라가 본다.
 *
 *   npm run check:play            # 목 서버 기준, 개발 서버 3001
 *
 * 시계를 빨리 돌린다(playwright clock). 4분짜리 칸을 4분 기다리지 않고
 * 「시작 → 시간이 다 됨 → 3초 쉼 → 다음 칸이 스스로 시작」 이 도는지,
 * 마지막 칸이 끝나면 「다 했어요」 와 알리기가 뜨는지 본다.
 *
 * 유튜브는 막는다. 영상이 안 떠도 타이머만으로 끝까지 가야 한다 — 그게 이 화면의 약속이다.
 */
import { chromium } from "playwright";

const PORT = process.argv[2] ?? "3001";
const BASE = `http://localhost:${PORT}`;
const KID = "00000000-0000-4000-8000-000000000012";
const HIDE = `nextjs-portal, [data-nextjs-toast], .tsqd-parent-container { display:none !important; }`;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(
  ([kid]) => {
    localStorage.setItem(
      "ff-role",
      JSON.stringify({ state: { mode: "kid", childProfileId: kid }, version: 0 }),
    );
    localStorage.setItem(
      "ff-auth",
      JSON.stringify({
        state: { accessToken: "mock-access-token", refreshToken: "r" },
        version: 0,
      }),
    );
  },
  [KID],
);
// 유튜브 스크립트 · 영상은 막는다. 없어도 타이머로 끝까지 가야 한다
await context.route(/youtube\.com|ytimg\.com/, (route) => route.abort());

const page = await context.newPage();
const errors = [];
/*
  유튜브를 막으면 영상 칸이 브라우저의 오류 문서가 되고, 그 문서가 localStorage 를 읽으려다
  SecurityError 를 낸다. 우리 코드가 아니라 막아 둔 영상 칸의 소리라 뺀다 — 막지 않고 돌리면
  이 오류는 없다.
*/
const BLOCKED_FRAME = /localStorage.*Access is denied/;
page.on("pageerror", (e) => {
  const line = String(e).split("\n")[0];
  if (!BLOCKED_FRAME.test(line)) errors.push(line);
});

const problems = [];
const expect = async (name, fn) => {
  try {
    await fn();
    console.log(`통과  ${name}`);
  } catch (e) {
    problems.push(`${name} — ${String(e).split("\n")[0]}`);
    console.log(`실패  ${name}`);
  }
};

await page.clock.install();
await page.goto(`${BASE}/kid/m/seed-today`, { waitUntil: "load" });
await page.addStyleTag({ content: HIDE }).catch(() => {});
await page.getByRole("button", { name: "시작하기" }).waitFor({ timeout: 20000 });

// 준비운동 둘은 이미 끝낸 채로 들어온다. 셋째 칸이 펼쳐져 있어야 한다
await expect("끝내지 않은 첫 칸이 펼쳐진다", async () => {
  await page.getByRole("region", { name: /3번째 운동/ }).waitFor({ timeout: 5000 });
});

await page.getByRole("button", { name: "시작하기" }).click();

await expect("시작하면 멈춤 단추가 된다", async () => {
  await page.getByRole("button", { name: "잠깐 멈춤" }).waitFor({ timeout: 3000 });
});

// 셋째 칸 4분이 지나면 10초 쉬고 넷째 칸이 스스로 시작한다
await page.clock.runFor(4 * 60 * 1000 + 600);
await expect("시간이 다 되면 다음 칸이 곧 시작한다고 말한다", async () => {
  await page.getByText(/곧 시작/).waitFor({ timeout: 3000 });
});
await expect("쉬는 동안 더 쉴 수 있다 — +10초", async () => {
  const more = page.getByRole("button", { name: /초 더 쉬기/ });
  await more.waitFor({ timeout: 3000 });
  await more.click();
});
await expect("소리 안내를 끌 수 있다", async () => {
  await page.getByRole("button", { name: /소리 안내 (끄기|켜기)/ }).waitFor({ timeout: 3000 });
});
// 더 쉰 10초까지 기다린다
await page.clock.runFor(10000);
await page.clock.runFor(10500);
await expect("쉬고 나면 다음 칸이 스스로 시작한다", async () => {
  await page.getByRole("region", { name: /4번째 운동/ }).waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "잠깐 멈춤" }).waitFor({ timeout: 3000 });
});

// 나머지 칸들 — 4분 · 1분 · 1분
for (const minutes of [4, 1, 1]) {
  await page.clock.runFor(minutes * 60 * 1000 + 600);
  await page.clock.runFor(10500);
}

await expect("다 끝나면 다 했어요가 뜬다", async () => {
  await page.getByRole("heading", { name: "오늘 거 다 했어요!" }).waitFor({ timeout: 5000 });
});
await expect("다 하고 나면 어땠는지 고를 수 있다", async () => {
  const good = page.getByRole("button", { name: "딱 좋아요" });
  await good.click({ timeout: 3000 });
  if ((await good.getAttribute("aria-pressed")) !== "true") throw new Error("눌리지 않는다");
});
await expect("엄마 · 아빠한테 알리기가 있다", async () => {
  await page.getByRole("button", { name: "엄마 · 아빠한테 알리기" }).waitFor({ timeout: 3000 });
});
await page.getByRole("button", { name: "엄마 · 아빠한테 알리기" }).click();
await expect("알리면 기다린다고 말한다 — 재촉하지 않는다", async () => {
  await page.getByText(/엄마 · 아빠가 보고 있어요/).waitFor({ timeout: 5000 });
});

const text = await page.locator("body").innerText();
await expect("아이 화면에 미션이라는 말이 없다", async () => {
  if (text.includes("미션")) throw new Error("「미션」 이 보인다");
});
if (errors.length > 0) problems.push(`페이지 오류: ${[...new Set(errors)].join(" / ")}`);

await browser.close();

if (problems.length > 0) {
  console.error("\n운동하기 문제:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log("\n운동하기 끝까지 이상 없음");
