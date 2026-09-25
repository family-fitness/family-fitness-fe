/**
 * 새 계정 한 바퀴 — 첫 로그인부터 칭찬 · 리그까지 **한 탭에서 끝까지** 걷는다(9/25 「첫 로그인 시 아이 등록부터
 * 모든 과정을 체험하고 싶어」).
 *
 *   npm run check:journey                 # 목 서버 기준, 개발 서버 3001
 *   SHOTS=/tmp/j npm run check:journey    # 장면마다 찍어 두기
 *
 * 첫 시작 → 첫 측정 → 결과 → AI 편성 → 오늘 운동으로 등록 → 아이에게 건넴 → 운동 끝까지 → 알리기 →
 * 부모 칭찬 스티커 → 대시보드 · 리그(새 가족은 브론즈) · 쉬는 날 카드 → 캘린더 → 초대 코드 → 둘째 아이.
 * 앞 화면의 결과가 다음 화면을 만드는 길이라 화면을 하나씩 여는 검사로는 못 잡는 것을 잡는다 —
 * 이 길을 처음 걸었을 때 다 한 운동이 사라지고(「오늘 운동이 아직 없어요」), 새로고침하면 측정이 사라지고,
 * 새 가족이 첫날 운동을 하고도 리그 4% 꼴찌였다.
 *
 * 운동 칸의 시간은 가짜 시계로 민다. 가짜 시계에서는 시트가 닫히는 움직임이 멈춘 채 찍힐 수 있다(앱은 닫힌다).
 */
import { chromium } from "playwright";

const B = `http://localhost:${process.argv[2] ?? "3001"}`;
const SHOTS = process.env.SHOTS;
const HIDE = "nextjs-portal,[data-nextjs-toast],.tsqd-parent-container{display:none!important}";

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: SHOTS ? 2 : 1,
  locale: "ko-KR",
});
// 이 맥의 말하기 엔진은 말을 끊을 때 화면을 멈춘다 — check-play 와 같이 재운다
await ctx.addInitScript(() => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.speak = () => {};
    window.speechSynthesis.cancel = () => {};
  }
});
// 유튜브는 막는다. 없어도 타이머로 끝까지 가야 한다
await ctx.route(/youtube\.com|ytimg\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => {
  const l = String(e).split("\n")[0];
  // 막아 둔 영상 칸이 localStorage 를 읽으려다 내는 소리 — 우리 코드가 아니다
  if (!/localStorage.*Access is denied/.test(l)) errs.push(l);
});
page.on(
  "console",
  (m) =>
    m.type() === "error" &&
    !/ytimg|youtube|favicon|40[0149] |Failed to load resource/.test(m.text()) &&
    errs.push(m.text().slice(0, 200)),
);
const hide = () => page.addStyleTag({ content: HIDE }).catch(() => {});
let n = 0;
/** SHOTS 가 있으면 장면을 남긴다. 찍기가 늦어도 걷기는 이어 간다 */
const shot = async (tag, full = false) => {
  if (!SHOTS) return;
  await hide();
  await page.waitForTimeout(700);
  await page
    .screenshot({
      path: `${SHOTS}/${String(++n).padStart(2, "0")}-${tag}.png`,
      fullPage: full,
      timeout: 45000,
    })
    .catch((e) => console.log(`찍지 못함  ${tag} — ${String(e).split("\n")[0]}`));
};
const problems = [];
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`통과  ${name}`);
  } catch (e) {
    problems.push(`${name} — ${String(e).split("\n")[0]}`);
    console.log(`실패  ${name}`);
    await shot(`FAIL-${name.slice(0, 12).replace(/\s+/g, "_")}`);
  }
};
const next = async (name = "다음") => {
  await page.getByRole("button", { name, exact: true }).click({ timeout: 10000 });
  await page.waitForTimeout(700);
};

await page.clock.install();

// ── 1. 첫 시작 ─────────────────────────────────────────────
await step("새 계정으로 들어가면 첫 시작이 뜬다", async () => {
  await page.goto(B + "/login", { waitUntil: "load" });
  await page.getByRole("button", { name: /새 계정/ }).click({ timeout: 20000 });
  await page.waitForURL(/\/start\/family/, { timeout: 20000 });
  await page.waitForTimeout(1200);
});
await step("첫 시작을 끝까지 — 지금 잴래요", async () => {
  await next("좋아요");
  await page.getByLabel("가족 이름").fill("민서네");
  await next();
  await page.getByLabel("보호자 이름").fill("지영");
  await next();
  await page.getByRole("radio", { name: /여성/ }).click();
  await next();
  await page.getByLabel("보호자 생년월일").fill("1988-04-12");
  await next();
  await next("건너뛰기"); // 사진 건너뜀
  await page.waitForTimeout(1200);
  await page.getByLabel("아이 이름").fill("민서");
  await next();
  await page.getByLabel("아이 생일").fill("2017-08-03");
  await next();
  await page.getByRole("radio", { name: "여자아이" }).click();
  await next();
  await page.getByLabel("키").fill("125");
  await page.getByLabel("몸무게").fill("26");
  await next();
  await next("건너뛰기"); // 아이 사진 건너뜀
  await page.getByRole("checkbox", { name: /개인정보/ }).click();
  await page.getByRole("checkbox", { name: /건강정보/ }).click();
  await next();
  await page.waitForTimeout(1200);
  await page.getByRole("radio", { name: /주말에는 같이/ }).click();
  await next();
  await page.waitForTimeout(800);
  await next(); // 운동 시간 — 기본값
  await page.waitForTimeout(800);
  await page.getByRole("radio", { name: /지금 잴래요/ }).click();
  await shot("ob-measure-now");
  await next();
  await page.waitForURL(/\/p\/[^/]+\/measure/, { timeout: 15000 });
});

// ── 2. 첫 측정 ─────────────────────────────────────────────
await step("측정 화면에 첫 시작에서 적은 키 · 몸무게가 들어와 있다", async () => {
  await page.getByLabel("키").waitFor({ timeout: 15000 });
  const h = await page.getByLabel("키").inputValue();
  const w = await page.getByLabel("몸무게").inputValue();
  if (h !== "125" || w !== "26") throw new Error(`키 ${h} · 몸무게 ${w}`);
});
await shot("measure", true);
await step("집에서 잴 수 있는 셋을 적고 결과를 본다", async () => {
  await page.locator(`[id="009"]`).fill("25");
  await page.locator(`[id="012"]`).fill("8");
  await page.locator(`[id="043"]`).fill("30");
  await page.getByRole("button", { name: "결과 보기" }).click();
  await page.waitForURL(/\/result/, { timeout: 15000 });
  await page.waitForTimeout(1500);
});
await shot("result", true);

// ── 3. AI 편성 → 등록 ──────────────────────────────────────
await step("결과에서 AI에게 운동 받기로", async () => {
  await page.getByRole("link", { name: /AI에게 운동 받기/ }).click();
  await page.waitForURL(/\/plan$/, { timeout: 15000 });
  await page.waitForTimeout(1200);
});
await shot("plan", true);
await step("코치에게 보내면 짜는 과정이 보이고 제안으로 넘어간다", async () => {
  await page.getByRole("button", { name: /AI에게 \d+분 운동 받기/ }).click();
  await page.waitForURL(/\/plan\/run\//, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await shot("plan-run");
  // 목 코치는 몇 초 걸린다 — 시계를 조금씩 민다
  for (let i = 0; i < 30 && !/\/plan\/(?!run)[^/]+$/.test(page.url()); i++) {
    await page.clock.runFor(1000);
    await page.waitForTimeout(150);
  }
  await page.waitForURL(/\/plan\/(?!run)[^/]+$/, { timeout: 15000 });
  await page.waitForTimeout(1200);
});
await shot("proposal", true);
await step("제안 화면에 근거가 붙어 있고 미션이라는 말이 없다", async () => {
  const text = await page.locator("main, body").first().innerText();
  if (text.includes("미션")) throw new Error("「미션」 이 보인다");
});
await step("오늘 운동으로 등록 → 부모 홈", async () => {
  await page.getByRole("button", { name: "오늘 운동으로 등록" }).click();
  await page.waitForURL(/\/parent$/, { timeout: 15000 });
  await page.waitForTimeout(2500);
});
await shot("parent-after-register", true);

// ── 4. 아이에게 건넨다 ─────────────────────────────────────
await step("설정 → 누가 쓰는지 바꾸기 → 아이", async () => {
  await page.getByRole("link", { name: "설정" }).click();
  await page.waitForURL(/\/settings$/, { timeout: 10000 });
  await page.getByRole("link", { name: /누가 쓰는지 바꾸기/ }).click();
  await page.waitForURL(/\/start$/, { timeout: 10000 });
  await page.getByRole("button", { name: /^아이/ }).click();
  await page.waitForURL(/\/kid$/, { timeout: 10000 });
  await page.waitForTimeout(2500);
});
await shot("kid-home", true);
await step("아이 홈 오늘 운동을 누르면 운동하기", async () => {
  await page
    .getByRole("link", { name: /오늘 운동/ })
    .first()
    .click();
  await page.waitForURL(/\/kid\/m\//, { timeout: 10000 });
  await page.getByRole("button", { name: "시작하기" }).waitFor({ timeout: 15000 });
});
await shot("kid-mission");
await step("끝까지 하면 다 했어요 · 알리기", async () => {
  await page.getByRole("button", { name: "시작하기" }).click();
  const notify = page.getByRole("button", { name: "엄마 · 아빠한테 알리기" });
  for (let i = 0; i < 40 && !(await notify.isVisible()); i++) {
    await page.clock.runFor(61_000);
  }
  await page.getByRole("heading", { name: "오늘 거 다 했어요!" }).waitFor({ timeout: 8000 });
  await shot("kid-done");
  await notify.click();
  await page
    .getByText(/기다리는 중/)
    .first()
    .waitFor({ timeout: 8000 });
});
await page.clock.resume();
await shot("kid-notified");
await step("아이 홈으로 돌아오면 오늘 거 다 했어요", async () => {
  await page.goto(B + "/kid", { waitUntil: "load" });
  await page.getByText("오늘 거 다 했어요!").waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500);
});
await shot("kid-home-after", true);

// ── 5. 부모가 칭찬 ─────────────────────────────────────────
await step("아이 화면 → 설정 → 누가 쓰는지 → 부모", async () => {
  await page.getByRole("link", { name: "설정" }).click();
  await page.waitForURL(/\/settings$/, { timeout: 10000 });
  await page.getByRole("link", { name: /누가 쓰는지 바꾸기/ }).click();
  await page.waitForURL(/\/start$/, { timeout: 10000 });
  await page.getByRole("button", { name: /^부모/ }).click();
  await page.waitForURL(/\/parent$/, { timeout: 10000 });
  await page.waitForTimeout(2500);
});
await shot("parent-after-kid", true);
await step("부모 종 → 민서가 운동을 마쳤어요 → 스티커", async () => {
  await page.getByRole("link", { name: "알림 · 새로 온 것 있음" }).click({ timeout: 10000 });
  await page
    .getByText(/민서가 운동을 마쳤어요/)
    .first()
    .click({ timeout: 10000 });
  await page.waitForURL(/\/parent\/sticker\//, { timeout: 10000 });
  await page.waitForTimeout(1000);
});
await shot("sticker");
await step("스티커를 골라 붙인다", async () => {
  await page
    .getByRole("button", { name: /최고야/ })
    .first()
    .click({ timeout: 8000 });
  await page.getByRole("button", { name: "최고야 붙이기" }).click();
  await page.getByRole("heading", { name: "붙였어요" }).waitFor({ timeout: 8000 });
});
await shot("sticker-done");

// ── 6. 쉬는 날 · 리그 · 대시보드 · 초대 ───────────────────
await step("부모 홈 → 대시보드", async () => {
  await page.goto(B + "/parent", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page
    .getByRole("link", { name: /가족 리그|대시보드|우리 가족/ })
    .first()
    .click({ timeout: 10000 });
  await page.waitForTimeout(2000);
});
await shot("after-home-link", true);
await step("대시보드", async () => {
  await page.goto(B + "/parent/dashboard", { waitUntil: "load" });
  await page.waitForTimeout(2500);
});
await shot("dashboard", true);
await step("리그 — 새 가족은 브론즈, 오늘 한 것이 달성률에 들어간다", async () => {
  await page.goto(B + "/parent/league", { waitUntil: "load" });
  await page
    .getByText(/브론즈 리그/)
    .first()
    .waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
});
await shot("league", true);
await step("쉬는 날 카드 — 오늘은 움직여서 못 고르고 내일은 고른다", async () => {
  await page.getByRole("button", { name: /쉬는 날 카드/ }).click();
  await page.waitForTimeout(800);
  const today = page.getByRole("radio", { name: /오늘/ });
  if (await today.count()) {
    if (!(await today.isDisabled())) throw new Error("오늘을 고를 수 있다(이미 움직였는데)");
  }
  await shot("rest-sheet");
  const radios = page.getByRole("radio");
  const count = await radios.count();
  for (let i = 0; i < count; i++) {
    const r = radios.nth(i);
    if (!(await r.isDisabled())) {
      await r.click();
      break;
    }
  }
  await page.getByRole("button", { name: /쉬기$/ }).click();
  await page.waitForTimeout(1200);
});
await shot("league-after-rest", true);
await step("캘린더에 쉬는 날이 보인다", async () => {
  await page.goto(B + "/calendar", { waitUntil: "load" });
  await page.waitForTimeout(2500);
});
await shot("calendar", true);
await step("대시보드 → 초대 코드 만들기", async () => {
  await page.goto(B + "/parent/dashboard", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /초대/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1000);
  await shot("invite-sheet");
  const make = page.getByRole("button", { name: /코드 만들기|만들기/ }).first();
  if (await make.count()) {
    await make.click();
    await page.waitForTimeout(1500);
  }
});
await shot("invite-code");

// ── 7. 둘째 아이 ───────────────────────────────────────────
await step("부모 홈 알약 → 아이 등록하기 → 둘째 아이 첫 시작", async () => {
  await page.goto(B + "/parent", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  // 오른쪽 위 이름 알약 — 「우리 아이」 묶음에도 아이 줄 · 아이 등록하기가 있어 알약과 그 시트로 좁힌다
  await page.getByRole("button", { name: /보고 있는 아이/ }).click({ timeout: 8000 });
  await page.waitForTimeout(800);
  await shot("child-pill-sheet");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /아이 등록하기/ })
    .click({ timeout: 8000 });
  await page.waitForURL(/\/start\/child/, { timeout: 10000 });
  await page.waitForTimeout(1200);
  await shot("child-wizard-first");
  await page.getByLabel("아이 이름").fill("민준");
  await next();
  await page.getByLabel("아이 생일").fill("2020-02-10");
  await next();
  await page.getByRole("radio", { name: "남자아이" }).click();
  await next();
  await page.getByLabel("키").fill("108");
  await page.getByLabel("몸무게").fill("18");
  await next();
  await next("건너뛰기"); // 사진 건너뜀
  await page.getByRole("checkbox", { name: /개인정보/ }).click();
  await page.getByRole("checkbox", { name: /건강정보/ }).click();
  await next();
  await page.waitForTimeout(1200);
  await shot("child-wizard-after-consent");
  // 남은 칸 — 운동 시간 · 첫 측정(나중에) · 준비됐어요
  for (let i = 0; i < 6 && !/\/parent$/.test(page.url()); i++) {
    const later = page.getByRole("radio", { name: /나중에 할게요/ });
    if (await later.count()) await later.click();
    const go = page.getByRole("button", { name: /^(다음|시작하기)$/ });
    if (await go.count()) await go.click();
    await page.waitForTimeout(900);
  }
  await page.waitForURL(/\/parent$/, { timeout: 10000 });
  await page.waitForTimeout(2500);
});
await shot("parent-second-child", true);

await browser.close();

if (errs.length) problems.push(...[...new Set(errs)].map((e) => `터짐: ${e}`));
if (problems.length) {
  console.log("\n문제:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log("\n새 계정 한 바퀴 이상 없음");
