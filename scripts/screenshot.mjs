import { chromium } from "playwright";

/**
 * 화면 캡처 도구.
 *
 *   npm run dev
 *   npm run shot -- http://localhost:3000 ./shots light viewport /home /missions
 *
 * PR 에 붙일 스크린샷을 뽑고, 만든 화면을 직접 눈으로 검토할 때 쓴다.
 * 설치된 Chrome 을 그대로 쓰므로 별도 브라우저를 내려받지 않는다.
 */
const [, , baseUrl, outDir, scheme, mode, ...paths] = process.argv;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "ko-KR",
  colorScheme: scheme,
});
const page = await context.newPage();

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

for (const p of paths) {
  const name = (p.replace(/\//g, "_").replace(/^_/, "") || "root") + `-${scheme}`;
  await page.goto(`${baseUrl}${p}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: mode === "full" });
  console.log(`saved ${name}.png`);
}

if (errors.length) {
  console.log("\n--- 콘솔 오류 ---");
  for (const e of [...new Set(errors)]) console.log(e);
}
await browser.close();
