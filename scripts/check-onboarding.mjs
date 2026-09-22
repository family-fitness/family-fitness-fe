/**
 * 처음 쓰는 사람이 끝까지 가는지 **실제로 걸어 본다.**
 *
 *   npm run check:onboarding          # 목 서버 기준
 *   npm run check:onboarding 3001     # 다른 포트
 *
 * 화면 검사(`check:screens`)는 화면을 하나씩 열어 볼 뿐이라, 가입처럼 **앞 화면의
 * 결과가 다음 화면을 만드는 길**은 못 잡는다. 실제로 `POST /families` 에 목 응답이
 * 없어서 새 사용자가 첫 관문을 못 넘고 있었는데 아무 검사도 빨갛지 않았다.
 *
 * 두 길을 걷는다.
 *   1. 가족 없는 계정 → 가족 만들기 → 아이 등록 → 참여 방식 → 부모 홈
 *   2. 초대받은 계정 → 자리 확인 → 참여 방식 → 역할 고르기
 */
import { chromium } from "playwright";

const PORT = process.argv[2] ?? "3001";
const BASE = `http://localhost:${PORT}`;
const HIDE = "nextjs-portal,[data-nextjs-toast],.tsqd-parent-container{display:none!important}";

const problems = [];
let steps = 0;

const browser = await chromium.launch({ channel: "chrome" });

/** 한 길을 걷는다. 중간에 넘어지면 어디서 넘어졌는지 남긴다 */
async function walk(name, run) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const noise = [];
  page.on("pageerror", (e) => noise.push("터짐: " + String(e).split("\n")[0].slice(0, 90)));
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !/favicon|ytimg|_next\/image|40[049] /.test(t)) {
      noise.push("콘솔: " + t.split("\n")[0].slice(0, 90));
    }
  });

  let at = "시작";
  const helper = {
    page,
    /** 지금 어느 단계인지 적어 둔다. 넘어지면 이 이름이 나온다 */
    async step(label, fn) {
      at = label;
      await fn();
      steps += 1;
    },
    /** 화면이 바뀌면 개발 오버레이가 다시 붙는다 */
    async settle(ms = 900) {
      await page.waitForTimeout(ms);
      await page.addStyleTag({ content: HIDE }).catch(() => {});
    },
    async until(re) {
      await page.waitForURL(re, { timeout: 25000 });
      await helper.settle();
    },
  };

  try {
    await run(helper);
  } catch (e) {
    problems.push(`${name} — 「${at}」 에서 멈춤\n    ${String(e).split("\n")[0].slice(0, 120)}`);
  }
  if (noise.length > 0) problems.push(`${name}\n    ${[...new Set(noise)].join("\n    ")}`);
  await ctx.close();
}

/* ─── 1. 가족이 없는 사람이 가입한다 ───────────────────────── */

await walk("새 가족 만들기", async (h) => {
  const { page } = h;
  await h.step("로그인 화면", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
    await h.settle(2400);
  });
  await h.step("가족 없는 계정으로 들어가기", async () => {
    await page.getByRole("button", { name: /새 계정/ }).click();
    await h.until(/\/start\/family/);
  });
  await h.step("가족 만들기 폼", async () => {
    await page.getByLabel("가족 이름").fill("민서네");
    await page.getByLabel("내 이름").fill("지영");
    await page.locator("input[type=date]").fill("1988-04-12");
    await page.getByRole("button", { name: "여성" }).click();
    await h.settle(300);
    await page.getByRole("button", { name: "가족 만들기" }).click();
    await h.until(/\/start\/child/);
  });
  await h.step("아이 이름 · 생일 · 성별", async () => {
    await page.getByLabel("이름", { exact: true }).fill("민서");
    await page.locator("input[type=date]").fill("2017-08-03");
    await page.getByRole("button", { name: "여자" }).click();
    await h.settle(300);
    await page.getByRole("button", { name: "다음" }).click();
    await h.settle(1100);
  });
  await h.step("키 · 몸무게 · 보호자 동의 둘", async () => {
    const nums = page.locator("input[type=number]");
    await nums.nth(0).fill("125");
    await nums.nth(1).fill("26");
    // 동의를 안 누르면 등록 단추가 잠겨 있어야 한다
    const locked = await page.getByRole("button", { name: "등록하기" }).isDisabled();
    if (!locked) problems.push("새 가족 만들기\n    동의 없이도 등록 단추가 열려 있다");
    await page.getByRole("button", { name: /개인정보 처리에 동의/ }).click();
    await page.getByRole("button", { name: /건강정보 처리에 동의/ }).click();
    await h.settle(300);
    await page.getByRole("button", { name: "등록하기" }).click();
    await h.settle(2200);
  });
  await h.step("등록 완료 → 참여 방식", async () => {
    await page.getByRole("button", { name: "다음" }).click();
    await h.until(/support-mode/);
  });
  await h.step("참여 방식 고르기", async () => {
    await page.getByRole("button", { name: /주말에는 같이/ }).click();
    await h.settle(1100);
    await page.getByRole("button", { name: "다 골랐어요" }).click();
    await h.until(/\/parent/);
  });
  await h.step("부모 홈이 새 가족을 보여 준다", async () => {
    const text = await page.locator("body").innerText();
    if (!text.includes("민서네")) problems.push("새 가족 만들기\n    부모 홈에 가족 이름이 없다");
    if (text.includes("서준")) problems.push("새 가족 만들기\n    남의 집 사람이 보인다");
  });
  await h.step("새로고침해도 남는다", async () => {
    await page.reload({ waitUntil: "load" });
    await h.settle(2200);
    const text = await page.locator("body").innerText();
    if (!text.includes("민서네")) {
      problems.push("새 가족 만들기\n    새로고침하면 가족이 사라진다");
    }
  });
});

/* ─── 2. 초대받은 사람이 자기 자리로 들어간다 ─────────────── */

await walk("초대 수락", async (h) => {
  const { page } = h;
  await h.step("로그인 화면", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
    await h.settle(2400);
  });
  await h.step("초대받은 계정으로 들어가기", async () => {
    await page.getByRole("button", { name: /초대받은 계정/ }).click();
    await h.until(/\/claim/);
  });
  await h.step("코드를 넣기 전에 자리가 보인다", async () => {
    await page.getByLabel("초대코드 여섯 자리").fill("K7M2QT");
    await page.waitForTimeout(1600);
    const text = await page.locator("body").innerText();
    if (!/자리/.test(text)) problems.push("초대 수락\n    어느 자리인지 안 보인다");
  });
  await h.step("자리로 들어가기", async () => {
    await page.getByRole("button", { name: /자리로 들어가기/ }).click();
    await h.until(/support-mode/);
  });
  await h.step("참여 방식 고르고 끝", async () => {
    await page.getByRole("button", { name: /응원할게요/ }).click();
    await h.settle(1100);
    await page.getByRole("button", { name: "다 골랐어요" }).click();
    await h.until(/\/start/);
  });
});

await browser.close();

if (problems.length > 0) {
  console.error("가입 경로 문제:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`가입 경로 두 갈래 · 단계 ${steps}개 이상 없음`);
