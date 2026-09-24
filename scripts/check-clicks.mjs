/**
 * 누를 수 있는 것을 전부 눌러 본다.
 *
 *   npm run check:clicks
 *
 * 화면이 열리는 것과 그 화면이 쓸 수 있는 것은 다르다. 24개 화면의 버튼과
 * 링크를 하나씩 눌러 보고 터지는지 · 콘솔이 우는지 · 눌렀더니 빈 화면이
 * 되는지 본다. 매번 돌리기엔 오래 걸려서 verify 에는 넣지 않았다. 화면 넷을 한꺼번에 돈다(WORKERS).
 */
import { chromium } from "playwright";
const B = "http://localhost:3001";
const KID = "00000000-0000-4000-8000-000000000012";
const SKIP = /devtools|dev tools|뒤로/i;

/** 개발 서버에만 뜨는 덮개들 */
const DEV_OVERLAY = `nextjs-portal, [data-nextjs-toast], .tsqd-parent-container {
  display: none !important;
}`;

const ROUTES = {
  parent: [
    "/parent",
    "/parent/family",
    "/parent/dashboard",
    `/parent/child/${KID}`,
    `/parent/sticker/${KID}`,
    "/calendar",
    "/notifications",
    "/plan",
    "/plan/custom",
    "/videos",
    "/videos?list=favorites",
    "/videos?list=recent",
    "/settings",
    "/settings/support-mode",
    "/settings/consent",
    `/p/${KID}/measure`,
    `/p/${KID}/result`,
    `/p/${KID}/future`,
    "/start",
    "/start/child",
    "/start/who",
  ],
  kid: ["/kid", "/kid/m/seed-today", "/kid/badges", "/calendar", "/notifications"],
};

const browser = await chromium.launch({ channel: "chrome" });
const found = [];

/**
 * 화면 하나를 맡아 그 화면의 누를 것을 전부 눌러 본다.
 * 누를 때마다 새 탭으로 연다 — 앞에서 누른 것이 다음 누름에 섞이지 않게.
 */
async function checkRoute(mode, route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(
    ([m, kid]) => {
      // 이 기기에 남는 고른 값(소리 안내 …)은 탭끼리 나눠 쓴다 — 앞 탭에서 누른 것이
      // 다음 탭의 누를 것 개수를 바꾸지 않게 매번 비운다
      localStorage.removeItem("ff-prefs");
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

  const scout = await ctx.newPage();
  await scout.goto(B + route, { waitUntil: "load" });
  await scout.waitForTimeout(1400);
  const count = await scout.locator("button:not([disabled]), a[href], [role=tab]").count();
  await scout.close();

  for (let i = 0; i < count; i++) {
    const page = await ctx.newPage();
    const bad = [];
    page.on("pageerror", (e) => bad.push("터짐: " + String(e).split("\n")[0].slice(0, 100)));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/favicon|ytimg|_next\/image|Failed to load resource/.test(m.text())
      )
        bad.push("콘솔: " + m.text().split("\n")[0].slice(0, 100));
    });
    let label = `#${i}`;
    try {
      await page.goto(B + route, { waitUntil: "load" });
      await page.waitForTimeout(1300);
      /* 개발 전용 덮개는 치운다. 운영에는 없는 것이 누름을 막으면 안 된다 */
      await page.addStyleTag({ content: DEV_OVERLAY });
      const el = page.locator("button:not([disabled]), a[href], [role=tab]").nth(i);
      label = ((await el.getAttribute("aria-label")) || (await el.innerText()) || `#${i}`)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 34);
      if (SKIP.test(label)) {
        await page.close();
        continue;
      }
      await el.click({ timeout: 6000 });
      await page.waitForTimeout(1500);
      // 여럿이 한꺼번에 도는 동안에는 다음 화면이 자리 잡기(skeleton)로 조금 더 머물 수 있다.
      // 글자가 설 때까지 조금 더 기다린 뒤에 「빈 화면」 을 판단한다
      await page
        .waitForFunction(() => document.body.innerText.trim().length >= 6, null, { timeout: 5000 })
        .catch(() => {});
      const text = (await page.locator("body").innerText()).trim();
      if (text.length < 6) bad.push(`누르니 빈 화면 (${new URL(page.url()).pathname})`);
    } catch (e) {
      bad.push("눌리지 않음: " + String(e).split("\n")[0].slice(0, 90));
    }
    if (bad.length)
      found.push(`${mode} ${route} — "${label}"\n    ${[...new Set(bad)].join("\n    ")}`);
    await page.close();
  }
  await ctx.close();
  process.stdout.write(".");
}

/*
  화면 몇 개를 한꺼번에 돈다. 캘린더 한 화면에만 누를 것이 마흔 개라
  하나씩 돌면 한 시간을 넘긴다. 화면끼리는 서로 기록을 나누지 않는다(탭마다 목 서버).
*/
const WORKERS = Number(process.env.WORKERS ?? 4);
const jobs = Object.entries(ROUTES).flatMap(([mode, routes]) =>
  routes.map((route) => ({ mode, route })),
);
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) await checkRoute(job.mode, job.route);
  }),
);
found.sort();
await browser.close();
console.log("\n" + (found.length ? "문제:\n  " + found.join("\n  ") : "누르는 것 전부 이상 없음"));
