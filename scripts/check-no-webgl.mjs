/**
 * WebGL 이 없는 브라우저에서도 화면과 놀이가 끝까지 도는지.
 *
 *   npm run check:nowebgl   (개발 서버가 떠 있어야 한다)
 *
 * AGENTS.md — 입체가 오기 전 · WebGL 이 없을 때도 빈 칸이 아니다. 놀이는 입체 없이도 끝까지 돈다.
 * 오래된 폰 · 저전력 모드 · 회사 PC 에서 WebGL 이 꺼져 있는 일이 흔하다.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3001";
const KID = "00000000-0000-4000-8000-000000000012";

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--disable-webgl", "--disable-3d-apis"],
});
let failed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`통과  ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`실패  ${name} — ${String(e).split("\n")[0].slice(0, 140)}`);
  }
};

async function open(mode, route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(
    ([m, kid]) => {
      localStorage.setItem(
        "ff-role",
        JSON.stringify({ state: { mode: m, childProfileId: kid }, version: 0 }),
      );
      localStorage.setItem(
        "ff-auth",
        JSON.stringify({
          state: { accessToken: "mock-access-token", refreshToken: "r" },
          version: 0,
        }),
      );
    },
    [mode, KID],
  );
  await ctx.route(/youtube\.com|ytimg\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    const line = String(e).split("\n")[0];
    // 막아 둔 유튜브 창이 저장소를 못 읽는 것 — 우리 화면 문제가 아니다
    if (!/localStorage.*Access is denied/.test(line)) errors.push(line);
  });
  await page.goto(BASE + route, { waitUntil: "load" });
  return { ctx, page, errors };
}

await check("WebGL 이 정말 꺼져 있다", async () => {
  const { ctx, page } = await open("kid", "/kid");
  const has = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  });
  await ctx.close();
  if (has) throw new Error("WebGL 이 켜져 있다 — 이 검사는 의미가 없다");
});

for (const [mode, route] of [
  ["parent", "/parent"],
  ["kid", "/kid"],
  ["parent", `/parent/child/${KID}`],
  ["kid", "/kid/badges"],
]) {
  await check(`${route} — 캔버스 없이 터지지 않고 그려진다`, async () => {
    const { ctx, page, errors } = await open(mode, route);
    await page.waitForTimeout(2200);
    const canvases = await page.locator("canvas").count();
    const text = (await page.locator("body").innerText()).trim();
    await ctx.close();
    if (errors.length) throw new Error(errors[0]);
    if (canvases > 0) throw new Error(`캔버스가 ${canvases}개 남아 있다`);
    if (text.length < 20) throw new Error("화면이 비어 있다");
  });
}

await check("얼음땡 — 시작하면 움직여요가 뜬다", async () => {
  const { ctx, page, errors } = await open("kid", "/kid/play/freeze");
  await page.getByRole("button", { name: "시작하기" }).click({ timeout: 20000 });
  await page.getByText("움직여요!").waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "그만하기" }).click();
  await ctx.close();
  if (errors.length) throw new Error(errors[0]);
});

await check("따라 해 봐 — 시작하면 동작을 보여 준다", async () => {
  const { ctx, page, errors } = await open("kid", "/kid/play/follow");
  await page.getByRole("button", { name: "시작하기" }).click({ timeout: 20000 });
  await page.getByText(/잘 보세요/).waitFor({ timeout: 5000 });
  await ctx.close();
  if (errors.length) throw new Error(errors[0]);
});

await check("운동하기 — 징검다리 대신 점줄이 선다", async () => {
  const { ctx, page, errors } = await open("kid", "/kid/m/seed-today");
  await page.getByRole("button", { name: "시작하기" }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  const dots = await page.locator(".sticky .rounded-full.size-3").count();
  await ctx.close();
  if (errors.length) throw new Error(errors[0]);
  if (dots === 0) throw new Error("칸을 보여 주는 점이 없다");
});

await browser.close();
console.log(failed === 0 ? "\nWebGL 없이도 이상 없음" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
