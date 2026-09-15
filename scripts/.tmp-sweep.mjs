import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2];
const SCHEME = process.argv[3] ?? "light";
mkdirSync(OUT, { recursive: true });

const KID = "00000000-0000-4000-8000-000000000012";
const ROUTES = [
  "/", "/login", "/claim",
  "/start", "/start/parent", "/start/child", "/start/who",
  "/parent", "/parent/history", "/parent/family",
  `/parent/child/${KID}`,
  "/kid", "/kid/stamps", `/kid/play/video-IdpXx2gm90o`,
  "/coach/weekly", "/coach/chat",
  "/missions/none", "/videos", "/videos/favorites", "/videos/recent",
  "/family/cheer", "/family/report",
  "/settings", "/settings/support-mode", "/settings/consent",
  `/p/${KID}`, `/p/${KID}/measure`, `/p/${KID}/result`, `/p/${KID}/future`,
];

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: SCHEME,
});
// 아이 모드로 보게 역할 저장소를 미리 채운다
await ctx.addInitScript(
  ([kid]) => {
    localStorage.setItem(
      "ff-role",
      JSON.stringify({ state: { mode: "kid", childProfileId: kid }, version: 0 }),
    );
  },
  [KID],
);

const problems = [];
for (const route of ROUTES) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).split("\n")[0]));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/favicon|ytimg|_next\/image|400 \(Bad Request\)|404 \(\)/.test(t))
      errs.push(t.split("\n")[0]);
  });
  try {
    await page.goto(`http://localhost:3001${route}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1100);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    if (overflow) errs.push("가로 스크롤 발생");
    // 빈 화면(글자가 거의 없음)도 문제다
    const text = await page.evaluate(() => document.body.innerText.trim().length);
    if (text < 10) errs.push(`화면이 비어 있음(글자 ${text}자)`);
    const name = route.replace(/\//g, "_").replace(KID, "kid") || "_root";
    await page.screenshot({ path: `${OUT}/${SCHEME}${name}.png`, fullPage: true });
  } catch (e) {
    errs.push(`로드 실패: ${String(e).split("\n")[0]}`);
  }
  if (errs.length) problems.push(`${route}\n    ${[...new Set(errs)].join("\n    ")}`);
  await page.close();
}

console.log(problems.length ? "문제:\n  " + problems.join("\n  ") : `${SCHEME}: 모든 경로 이상 없음`);
await browser.close();
