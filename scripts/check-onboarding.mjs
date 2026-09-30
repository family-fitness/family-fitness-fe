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
 * 여섯 길을 걷는다.
 *   1. 가족 없는 계정 → 첫 시작(키움이 인사 · 가족 · 보호자 · 아이 · 동의 · 참여 방식 · 운동 시간 · 첫 측정) → 부모 홈
 *   2. 초대받은 계정 → 자리 확인 → 참여 방식 → 역할 고르기
 *   3. 첫 시작 중간에 새로고침 — 가족을 만든 뒤 · 아이를 만든 뒤. 두 번 만들지 않고 이어 간다.
 *      아이 등록 첫 칸의 뒤로 · 「지금 잴래요」 측정 화면의 뒤로가 홈으로 가는지
 *   4. 심사용 계정 → 세 흐름을 고르는 시트 → 들어가는 화면. 360px 폰에서
 *      체험 가족은 역할 고르기 없이 부모 홈(가족 이름이 잘리지 않는지), 처음 가입은 가족 만들기,
 *      초대받은 보호자는 코드가 채워진 합류 화면에서 자리로 들어가 참여 방식까지
 */
import { chromium } from "playwright";

const PORT = process.argv[2] ?? "3001";
const BASE = `http://localhost:${PORT}`;
const HIDE = "nextjs-portal,[data-nextjs-toast],.tsqd-parent-container{display:none!important}";

const problems = [];
let steps = 0;

const browser = await chromium.launch({ channel: "chrome" });

/** 한 길을 걷는다. 중간에 넘어지면 어디서 넘어졌는지 남긴다 */
async function walk(name, run, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport });
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
  /** 첫 시작 — 한 화면에 질문 하나. 칸마다 「다음」 */
  const next = async (name = "다음") => {
    await page.getByRole("button", { name, exact: true }).click();
    await h.settle(700);
  };
  await h.step("키움이 인사", async () => {
    await page.getByRole("heading", { name: /저는 키움이에요/ }).waitFor({ timeout: 8000 });
    await next("좋아요");
  });
  await h.step("가족 이름 · 보호자 이름 · 성별 · 생년월일", async () => {
    await page.getByLabel("가족 이름").fill("민서네");
    await next();
    await page.getByLabel("보호자 이름").fill("지영");
    await next();
    await page.getByRole("radio", { name: /여성/ }).click();
    await next();
    await page.getByLabel("보호자 생년월일").fill("1988-04-12");
    await next();
  });
  await h.step("보호자 사진은 건너뛴다 → 가족이 생긴다", async () => {
    await next("건너뛰기");
    await page.getByLabel("아이 이름").waitFor({ timeout: 8000 });
    // 가족을 만든 뒤에는 뒤로 가지 않는다 — 두 번 만들지 않게
    if (await page.getByRole("button", { name: "뒤로" }).count()) {
      problems.push("새 가족 만들기\n    가족을 만든 뒤에도 뒤로 단추가 있다");
    }
  });
  await h.step("아이 이름 · 생일 · 성별 · 키 · 몸무게", async () => {
    await page.getByLabel("아이 이름").fill("민서");
    await next();
    await page.getByLabel("아이 생일").fill("2017-08-03");
    await next();
    await page.getByRole("radio", { name: "여자아이" }).click();
    await next();
    await page.getByLabel("키").fill("125");
    await page.getByLabel("몸무게").fill("26");
    await next();
    await next("건너뛰기"); // 아이 사진
  });
  await h.step("보호자 동의 둘", async () => {
    // 동의를 안 누르면 다음이 잠겨 있어야 한다
    const locked = await page.getByRole("button", { name: "다음", exact: true }).isDisabled();
    if (!locked) problems.push("새 가족 만들기\n    동의 없이도 다음이 열려 있다");
    await page.getByRole("checkbox", { name: /개인정보 처리에 동의/ }).click();
    await page.getByRole("checkbox", { name: /건강정보 처리에 동의/ }).click();
    await next();
    await h.settle(900);
  });
  await h.step("참여 방식 · 운동할 수 있는 시간", async () => {
    await page.getByRole("radio", { name: /주말에는 같이/ }).click();
    await next();
    await h.settle(600);
    await page.getByRole("heading", { name: /언제 운동할 수 있어요/ }).waitFor({ timeout: 8000 });
    await next();
  });
  await h.step("첫 측정은 나중에 → 준비됐어요 → 부모 홈", async () => {
    await page.getByRole("radio", { name: /나중에 할게요/ }).click();
    await next();
    await page.getByRole("heading", { name: "준비됐어요!" }).waitFor({ timeout: 8000 });
    await next("시작하기");
    await h.until(/\/parent/);
    await h.settle(1500);
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

/* ─── 3. 첫 시작 중간에 새로고침 ──────────────────────────── */

await walk("새로고침에도 두 번 만들지 않는다", async (h) => {
  const { page } = h;
  const next = async (name = "다음") => {
    await page.getByRole("button", { name, exact: true }).click();
    await h.settle(700);
  };
  await h.step("가족까지 만든다", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
    await h.settle(2400);
    await page.getByRole("button", { name: /새 계정/ }).click();
    await h.until(/\/start\/family/);
    await next("좋아요");
    await page.getByLabel("가족 이름").fill("하늘네");
    await next();
    await page.getByLabel("보호자 이름").fill("도현");
    await next();
    await page.getByRole("radio", { name: /남성/ }).click();
    await next();
    await page.getByLabel("보호자 생년월일").fill("1984-02-20");
    await next();
    await next("건너뛰기"); // 사진
    await page.getByLabel("아이 이름").waitFor({ timeout: 8000 });
  });
  await h.step("새로고침하면 아이 등록으로 — 가족을 다시 만들지 않는다", async () => {
    await page.reload({ waitUntil: "load" });
    await h.until(/\/start\/child/);
    await page.getByLabel("아이 이름").waitFor({ timeout: 10000 });
  });
  await h.step("아이 등록 첫 칸에 뒤로가 있다", async () => {
    if ((await page.getByRole("button", { name: "뒤로" }).count()) === 0) {
      problems.push("새로고침에도 두 번 만들지 않는다\n    아이 등록 첫 칸에 나가는 길이 없다");
    }
  });
  await h.step("아이를 만든다", async () => {
    await page.getByLabel("아이 이름").fill("하늘");
    await next();
    await page.getByLabel("아이 생일").fill("2016-05-01");
    await next();
    await page.getByRole("radio", { name: "남자아이" }).click();
    await next();
    await page.getByLabel("키").fill("132");
    await page.getByLabel("몸무게").fill("30");
    await next();
    await next("건너뛰기"); // 사진
    await page.getByRole("checkbox", { name: /개인정보 처리에 동의/ }).click();
    await page.getByRole("checkbox", { name: /건강정보 처리에 동의/ }).click();
    await next();
  });
  // 가족만 만들고 새로고침했다 — 참여 방식을 아직 안 골랐으니 아이 다음에 묻는다(안 물으면 영영 빈다)
  await h.step("아이 다음에 참여 방식을 묻는다", async () => {
    await page.getByRole("heading", { name: /얼마나 같이 하실래요/ }).waitFor({ timeout: 8000 });
    await page.getByRole("radio", { name: /매번 같이/ }).click();
    await next();
    // 고른 뒤 나(/me)가 다시 와도 운동 시간 칸을 건너뛰지 않는다
    await h.settle(1500);
    await page.getByRole("heading", { name: /언제 운동할 수 있어요/ }).waitFor({ timeout: 8000 });
  });
  await h.step("새로고침하면 그 아이로 이어 간다 — 아이 이름부터 다시 묻지 않는다", async () => {
    await page.reload({ waitUntil: "load" });
    await h.settle(2000);
    await page
      .getByRole("heading", { name: /하늘은 언제 운동할 수 있어요/ })
      .waitFor({ timeout: 10000 });
    await next();
  });
  await h.step("지금 잴래요 → 측정 화면 뒤로는 홈", async () => {
    await page.getByRole("radio", { name: /지금 잴래요/ }).click();
    await next();
    await h.until(/\/measure\?from=start/);
    await page.getByRole("link", { name: "뒤로" }).click();
    await h.until(/\/parent$/);
  });
  await h.step("아이는 한 명이다", async () => {
    await page.goto(`${BASE}/parent/family`, { waitUntil: "load" });
    await h.settle(2000);
    const kids = await page.getByText(/· 자녀/).count();
    if (kids !== 1) problems.push(`새로고침에도 두 번 만들지 않는다\n    아이가 ${kids}명`);
  });
});

/* ─── 4. 심사위원이 심사용 계정으로 둘러본다 ─────────────── */

/** 로그인 화면에서 「심사용 계정으로 둘러보기」 를 누르고 시트에서 한 줄을 고른다 */
async function reviewAs(h, title) {
  const { page } = h;
  await h.step("로그인 화면", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
    await h.settle(2400);
  });
  await h.step("링크를 누르면 세 흐름을 고르는 시트가 뜬다", async () => {
    await page.getByRole("button", { name: "심사용 계정으로 둘러보기" }).click();
    await page.getByRole("dialog", { name: "어떻게 둘러볼까요" }).waitFor({ timeout: 3000 });
    await h.settle(500);
  });
  await h.step(`「${title}」 을 고르면 들어가는 화면이 뜬다`, async () => {
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await page.getByText("심사용 계정으로 들어가는 중").waitFor({ timeout: 3000 });
  });
}

await walk(
  "심사용 계정 — 체험 가족",
  async (h) => {
    const { page } = h;
    await reviewAs(h, "체험 가족으로 둘러보기");
    // 처음 보는 기기라 역할을 고른 적이 없다 — 그래도 「누가 쓰고 있나요」 를 거치지 않고 부모 홈으로 간다
    await h.step("역할 고르기 없이 부모 홈", async () => {
      await h.until(/\/(parent|start)$/);
      if (!/\/parent$/.test(page.url())) {
        problems.push(`심사용 계정\n    홈이 아니라 ${new URL(page.url()).pathname} 에 닿았다`);
        await page.getByRole("button", { name: /부모/ }).click();
        await h.until(/\/parent$/);
      }
      await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 10000 });
    });
    // 진짜 서버의 체험 가족 이름(「체험 가족」)을 넣어 본다. 아이 알약 · 알림 · 설정과 한 줄에 선다
    await h.step("360px 에서 가족 이름이 잘리지 않는다", async () => {
      const cut = await page.getByRole("heading", { level: 1 }).evaluate(async (h1) => {
        const span = h1.querySelector("span") ?? h1;
        span.textContent = "체험 가족";
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        return span.scrollWidth > span.clientWidth;
      });
      if (cut) problems.push("심사용 계정\n    360px 에서 가족 이름 「체험 가족」 이 잘린다");
    });
  },
  { width: 360, height: 780 },
);

// 처음 가입하는 흐름 — 평소 가입과 같이 가족 만들기부터
await walk(
  "심사용 계정 — 처음부터 가입",
  async (h) => {
    const { page } = h;
    await reviewAs(h, "처음부터 가입해 보기");
    await h.step("가족 만들기로 간다", async () => {
      await h.until(/\/start\/family/);
      await page.getByRole("heading", { name: /저는 키움이에요/ }).waitFor({ timeout: 8000 });
    });
  },
  { width: 360, height: 780 },
);

// 초대받아 들어오는 흐름 — 서버가 준 초대코드가 미리 채워진 합류 화면으로
await walk(
  "심사용 계정 — 초대받은 보호자",
  async (h) => {
    const { page } = h;
    await reviewAs(h, "초대받은 보호자로 들어가 보기");
    await h.step("초대코드가 채워진 합류 화면", async () => {
      await h.until(/\/claim\?code=/);
      const code = await page.getByLabel("초대코드 여섯 자리").inputValue();
      if (code !== "K7M2QT") problems.push(`심사용 계정 — 초대\n    코드 칸이 「${code}」`);
    });
    await h.step("자리로 들어가 참여 방식까지", async () => {
      await page.getByRole("button", { name: /자리로 들어가기/ }).click();
      await h.until(/support-mode/);
    });
  },
  { width: 360, height: 780 },
);

await browser.close();

if (problems.length > 0) {
  console.error("가입 경로 문제:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`가입 경로 여섯 갈래 · 단계 ${steps}개 이상 없음`);
