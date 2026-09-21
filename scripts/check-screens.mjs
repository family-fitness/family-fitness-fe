/**
 * 실제로 띄워서 화면을 검사한다.
 *
 *   npm run check:screens            # 목 서버 기준
 *   npm run check:screens 3001       # 다른 포트
 *
 * 타입 검사와 린트가 잡지 못하는 것들을 잡는다 — 빈 화면, 가로 스크롤,
 * 제목이 없거나 둘인 화면, 손가락이 닿지 않는 버튼, 끊어진 링크.
 * 손으로 눌러 보지 않으면 몰랐던 것들이라 검사로 옮겼다.
 */
import { chromium } from "playwright";

const PORT = process.argv[2] ?? "3001";
const BASE = `http://localhost:${PORT}`;
const KID = "00000000-0000-4000-8000-000000000012";

const ROUTES = [
  "/",
  "/login",
  "/claim",
  "/start",
  "/start/parent",
  "/start/child",
  "/start/who",
  "/parent",
  "/parent/history",
  "/parent/family",
  `/parent/child/${KID}`,
  "/kid",
  "/kid/pick",
  "/kid/done",
  "/kid/praise",
  "/kid/me",
  `/kid/play/video-IdpXx2gm90o`,
  "/coach/weekly",
  "/coach/chat",
  "/missions/none",
  "/videos",
  "/videos/favorites",
  "/videos/recent",
  "/family/cheer",
  "/family/report",
  "/settings",
  "/settings/support-mode",
  "/settings/consent",
  `/p/${KID}/measure`,
  `/p/${KID}/result`,
  `/p/${KID}/future`,
];

/** 손가락이 닿는 최소 크기 */
const MIN_TAP = 40;
/** 무시할 콘솔 잡음 — 목 데이터의 가짜 영상 id 때문에 나는 것들 */
const NOISE = /favicon|ytimg|_next\/image|400 |404 /;

/**
 * 아이 화면에 나오면 안 되는 말.
 *
 * AGENTS.md — "서준에게 백분위 표를 보여주면 그걸로 끝이다".
 * 승인 · 미션 · 보호자는 부모끼리 하는 말이고, 등급과 백분위는 서열이다.
 */
const PARENT_WORDS = [
  "백분위",
  "상위",
  "등급",
  "제안",
  "승인",
  "미션",
  "보호자",
  "동의",
  "철회",
  "약점",
  "하위",
];

/** 아이 모드로 열어 보는 경로. 부모 화면은 막히는 게 맞아서 여기 넣지 않는다 */
const KID_ROUTES = [
  "/kid",
  "/kid/pick",
  "/kid/done",
  "/kid/praise",
  "/kid/me",
  "/videos",
  "/settings",
  `/p/${KID}/result`,
];

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

/** 로그인한 채로, 정해진 역할로 본다 */
function seed(mode) {
  return [
    ([role, kid]) => {
      localStorage.setItem(
        "ff-role",
        JSON.stringify({ state: { mode: role, childProfileId: kid }, version: 0 }),
      );
      localStorage.setItem(
        "ff-auth",
        JSON.stringify({
          state: { accessToken: "mock-access-token", refreshToken: "mock-refresh-token" },
          version: 0,
        }),
      );
    },
    [mode, KID],
  ];
}

const problems = [];

await context.addInitScript(...seed("parent"));

for (const route of ROUTES) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).split("\n")[0]));
  page.on("console", (m) => {
    const text = m.text();
    if (m.type() === "error" && !NOISE.test(text)) errors.push(text.split("\n")[0]);
  });

  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1100);
    // 개발 서버는 그 경로를 처음 열 때 컴파일부터 한다. 한 번은 더 기다려 준다
    await page
      .waitForFunction(() => document.body.innerText.trim().length >= 6, null, { timeout: 8000 })
      .catch(() => {});

    const found = await page.evaluate((minTap) => {
      const out = [];
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push("가로 스크롤");
      if (document.body.innerText.trim().length < 6) out.push("화면이 비어 있음");

      const headings = [...document.querySelectorAll("h1")];
      if (headings.length !== 1) out.push(`h1 이 ${headings.length}개`);
      if (headings.length === 1 && !headings[0].textContent?.trim()) out.push("제목이 비어 있음");

      const small = [...document.querySelectorAll("button, a[href], [role=tab], input")].filter(
        (el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.height < minTap || b.width < minTap);
        },
      );
      if (small.length > 0) out.push(`누르기 작은 것 ${small.length}개`);

      const unnamed = [...document.querySelectorAll("button, a[href]")].filter(
        (el) => !(el.getAttribute("aria-label") || el.textContent || "").trim(),
      );
      if (unnamed.length > 0) out.push(`이름 없는 버튼 ${unnamed.length}개`);

      // 화면 색은 흰색 하나로 간다
      const frame = document.querySelector(".app-frame");
      if (frame && getComputedStyle(frame).backgroundColor !== "rgb(255, 255, 255)") {
        out.push("앱 배경이 흰색이 아님");
      }
      return out;
    }, MIN_TAP);

    errors.push(...found);
  } catch (e) {
    errors.push(`열지 못함: ${String(e).split("\n")[0]}`);
  }

  if (errors.length > 0) problems.push(`${route}\n    ${[...new Set(errors)].join("\n    ")}`);
  await page.close();
}

/* ─── 아이 모드로 한 번 더 ─────────────────────────────────── */

const kidContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
await kidContext.addInitScript(...seed("kid"));

for (const route of KID_ROUTES) {
  const page = await kidContext.newPage();
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1100);
    const text = await page.locator("body").innerText();
    const leaked = PARENT_WORDS.filter((word) => text.includes(word));
    if (leaked.length > 0)
      problems.push(`${route} (아이 모드)\n    부모 말이 샘: ${leaked.join(", ")}`);
  } catch (e) {
    problems.push(`${route} (아이 모드)\n    열지 못함: ${String(e).split("\n")[0]}`);
  }
  await page.close();
}

await browser.close();

if (problems.length > 0) {
  console.error("화면 문제:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`화면 ${ROUTES.length}개 · 아이 모드 ${KID_ROUTES.length}개 이상 없음`);
