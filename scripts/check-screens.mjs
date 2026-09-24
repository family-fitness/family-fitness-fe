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
  "/start/family",
  "/start/child",
  "/start/who",
  "/parent",
  "/parent/family",
  `/parent/child/${KID}`,
  `/parent/sticker/${KID}`,
  "/kid",
  "/kid/badges",
  "/kid/play",
  "/kid/play/dice",
  "/kid/play/freeze",
  "/kid/play/follow",
  "/kid/m/seed-today",
  "/calendar",
  "/calendar/2026-09-23",
  "/notifications",
  "/plan",
  "/plan/custom",
  "/videos",
  "/videos?list=favorites",
  "/videos?list=recent",
  "/settings",
  "/settings/support-mode",
  "/settings/consent",
  "/settings/schedule",
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
  "/kid/badges",
  "/kid/play",
  "/kid/play/dice",
  "/kid/play/freeze",
  "/kid/play/follow",
  "/calendar",
  "/calendar/2026-09-23",
  "/notifications",
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

      // 바탕은 연회색 하나로 간다(--color-ground). 화면마다 바탕을 따로 칠하면
      // 흰 카드가 떠 보이지 않는다
      const frame = document.querySelector(".app-frame");
      if (frame && getComputedStyle(frame).backgroundColor !== "rgb(244, 245, 247)") {
        out.push("앱 바탕이 --color-ground 가 아님");
      }

      /*
        글자 대비. 작은 글씨는 4.5:1, 큰 글씨(24px · 굵은 19px 이상)는 3:1.
        연한 회색 글자가 흰 카드 위에서 2.8:1 로 햇빛 아래 사라지고 있었다.
        바탕은 글자에서 위로 올라가며 처음 만나는 칠한 면으로 본다.
      */
      /*
        색 문자열을 [r, g, b, a] 로. Tailwind v4 는 반투명 색을 oklab() · color-mix() 로
        내보내서 숫자만 뽑으면 엉뚱한 색이 된다 — 캔버스에 칠해서 브라우저가 읽게 한다.
      */
      const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const rgb = (c) => {
        pen.clearRect(0, 0, 1, 1);
        pen.fillStyle = "rgba(0,0,0,0)";
        pen.fillStyle = c;
        pen.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };
      const lum = ([r, g, b]) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      /*
        글자 뒤의 바탕. 위로 올라가며 칠한 면을 모으고, 반투명한 면은 아래 면과
        섞는다 — 썸네일 위 검은 반투명 띠를 흰색으로 보면 흰 글자가 1:1 로 잡힌다.
      */
      const bgOf = (el) => {
        const layers = [];
        for (let n = el; n; n = n.parentElement) {
          const c = rgb(getComputedStyle(n).backgroundColor);
          const a = c[3];
          if (a === 0) continue;
          layers.push([c[0], c[1], c[2], a]);
          if (a >= 0.99) break;
        }
        let out = [255, 255, 255];
        for (const [r, g, b, a] of layers.reverse()) {
          out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
        }
        return out;
      };
      /** 반투명 글자도 바탕에 섞어서 본다 */
      const fgOf = (color, bg) => {
        const c = rgb(color);
        const a = c[3];
        return [c[0] * a + bg[0] * (1 - a), c[1] * a + bg[1] * (1 - a), c[2] * a + bg[2] * (1 - a)];
      };
      const faint = [];
      for (const el of document.querySelectorAll("body *")) {
        const own = [...el.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim());
        if (!own) continue;
        const st = getComputedStyle(el);
        if (st.visibility === "hidden" || Number(st.opacity) < 0.5) continue;
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        const bg = bgOf(el);
        const fg = fgOf(st.color, bg);
        const [a, b] = [lum(fg), lum(bg)];
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const size = parseFloat(st.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(st.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5)) {
          faint.push(`${el.textContent.trim().slice(0, 12)}(${ratio.toFixed(1)})`);
        }
      }
      if (faint.length > 0) {
        out.push(`글자 대비 부족 ${faint.length}곳: ${faint.slice(0, 4).join(" · ")}`);
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

/* ─── 좁은 폰에서 한 번 더 ─────────────────────────────────── */

/**
 * 320px. 아이폰 SE 와 갤럭시 폴드 접은 화면이 이만하다.
 *
 * 390 에서만 보면 가로로 넘치는 걸 못 잡는다 — 긴 이름 하나에 아이 홈
 * 제목이 화면 밖으로 나가던 것이 여기서 잡혔다.
 * 여기서는 **가로 스크롤만** 본다. 누르는 크기와 제목 수는 폭과 무관하다.
 */
const narrow = await browser.newContext({ viewport: { width: 320, height: 720 } });
await narrow.addInitScript(...seed("parent"));

for (const route of ROUTES) {
  const page = await narrow.newPage();
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(900);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    if (over) problems.push(`${route} (320px)\n    가로 스크롤`);
  } catch {
    // 넓은 화면에서 이미 봤다. 여기서 못 연 건 따로 적지 않는다
  }
  await page.close();
}

await browser.close();

if (problems.length > 0) {
  console.error("화면 문제:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(
  `화면 ${ROUTES.length}개 · 아이 모드 ${KID_ROUTES.length}개 · 좁은 폰 ${ROUTES.length}개 이상 없음`,
);
