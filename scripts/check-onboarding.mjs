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
 *   1. 가족 없는 계정 → 첫 시작 다섯 화면(인사와 가족, 보호자 / 아이 / 키, 몸무게, 동의 / 운동 시간, 참여 방식 / 준비됐어요) → 부모 홈
 *   2. 초대받은 계정 → 자리 확인 → 참여 방식 → 역할 고르기
 *   3. 첫 시작 중간에 닫았다가 다시 열면 아이 등록이 아니라 가족 화면부터. 아이를 만든 뒤 새로고침하면 이어 간다.
 *      「지금 잴래요」 측정 화면의 뒤로가 홈으로 가는지
 *   4. 심사용 계정 → 세 흐름을 고르는 시트 → 들어가는 화면. 360px 폰에서
 *      체험 가족은 역할 고르기 없이 부모 홈(가족 이름이 잘리지 않는지), 처음 가입은 가족 만들기,
 *      초대받은 보호자는 코드가 채워진 합류 화면에서 자리로 들어가 참여 방식까지
 *   5. 첫 시작 중간에 폰이나 브라우저의 뒤로를 누르면 한 화면 앞으로 가고 적은 것이 남는다.
 *      가족과 아이를 만든 뒤에는 그 앞으로 가지 않는다
 *   6. 첫 시작 중간에 새로고침한 뒤 폰의 뒤로를 누르면 적은 것이 사라진 앞 화면(빈 칸)이 아니라 첫 시작 밖으로 나간다
 */
import { chromium } from "playwright";

const PORT = process.argv[2] ?? "3001";
const BASE = `http://localhost:${PORT}`;
const HIDE = "nextjs-portal,[data-nextjs-toast],.tsqd-parent-container{display:none!important}";

/**
 * 날짜 칸에서 날을 고른다. 칸을 누르면 바닥 시트 달력이 열리고, 연도와 월 드롭다운으로 간 뒤 그날을 누른다.
 * 날짜 칸이 브라우저 기본 칸이 아니라서 fill 로 넣을 수 없다.
 */
async function pickDate(page, label, date) {
  const [y, m, d] = date.split("-").map(Number);
  await page.getByRole("button", { name: new RegExp(`^${label},`) }).click();
  const sheet = page.getByRole("dialog", { name: label });
  await sheet.getByRole("combobox", { name: "연도 선택" }).selectOption(String(y));
  await sheet.getByRole("combobox", { name: "월 선택" }).selectOption(String(m - 1));
  await sheet.getByRole("button", { name: new RegExp(`${y}년 ${m}월 ${d}일`) }).click();
  await sheet.waitFor({ state: "detached", timeout: 5000 });
}

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
    // 유튜브 썸네일은 다음 화면으로 넘어가며 받다 끊기면 「Failed to load resource」 만 남는다 — 글에는 주소가 없어 자리로 거른다
    const from = m.location()?.url ?? "";
    if (
      m.type() === "error" &&
      !/favicon|ytimg|_next\/image|40[049] /.test(t) &&
      !/ytimg|youtube/.test(from)
    ) {
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
  await h.step("키움이 인사와 가족, 보호자가 한 화면", async () => {
    await page.getByRole("heading", { name: /저는 키움이에요/ }).waitFor({ timeout: 8000 });
    await page.getByLabel("가족 이름").fill("민서네");
    await page.getByLabel("보호자 이름").fill("지영");
    await page.getByRole("radio", { name: /여성/ }).click();
    await pickDate(page, "보호자 생년월일", "1988-04-12");
    await next();
  });
  await h.step("아이 이름, 생일, 성별이 한 화면", async () => {
    await page.getByLabel("아이 이름").fill("민서");
    await pickDate(page, "아이 생일", "2017-08-03");
    await page.getByRole("radio", { name: "여자아이" }).click();
    await next();
  });
  await h.step("키, 몸무게와 보호자 동의가 한 화면", async () => {
    await page.getByLabel("키").fill("125");
    await page.getByLabel("몸무게").fill("26");
    // 동의를 안 누르면 다음이 잠겨 있어야 한다
    const locked = await page.getByRole("button", { name: "다음", exact: true }).isDisabled();
    if (!locked) problems.push("새 가족 만들기\n    동의 없이도 다음이 열려 있다");
    await page.getByRole("checkbox", { name: /개인정보 수집 및 이용에 동의/ }).click();
    await page.getByRole("checkbox", { name: /민감정보\(건강정보\) 처리에 동의/ }).click();
    await next();
    await h.settle(900);
  });
  await h.step("운동할 수 있는 시간과 참여 방식이 한 화면", async () => {
    await page.getByRole("heading", { name: /언제 운동할 수 있어요/ }).waitFor({ timeout: 8000 });
    // 가족과 아이를 만든 뒤에는 뒤로 가지 않는다 — 두 번 만들지 않게
    if (await page.getByRole("button", { name: "뒤로" }).count()) {
      problems.push("새 가족 만들기\n    가족과 아이를 만든 뒤에도 뒤로 단추가 있다");
    }
    await page.getByRole("radio", { name: /주말에는 같이/ }).click();
    await next();
  });
  await h.step("준비됐어요에서 나중에 할게요, 부모 홈", async () => {
    await page.getByRole("heading", { name: "준비됐어요!" }).waitFor({ timeout: 8000 });
    await next("나중에 할게요");
    await h.until(/\/parent/);
    await h.settle(1500);
  });
  await h.step("부모 홈이 새 가족을 보여 준다", async () => {
    const text = await page.locator("body").innerText();
    if (!text.includes("민서네")) problems.push("새 가족 만들기\n    부모 홈에 가족 이름이 없다");
    if (text.includes("서준")) problems.push("새 가족 만들기\n    남의 집 사람이 보인다");
  });
  await h.step("처음 한 번 환영 안내 — 닫으면 이 기기에서 다시 안 뜬다", async () => {
    const welcome = page.getByRole("dialog", { name: "환영합니다" });
    await welcome.waitFor({ timeout: 8000 });
    // 위 X 도 「닫기」 다 — 아래 큰 단추를 누른다
    await welcome.getByRole("button", { name: "닫기", exact: true }).last().click();
    await h.settle(900);
  });
  await h.step("새로고침해도 남는다", async () => {
    await page.reload({ waitUntil: "load" });
    await h.settle(2200);
    const text = await page.locator("body").innerText();
    if (!text.includes("민서네")) {
      problems.push("새 가족 만들기\n    새로고침하면 가족이 사라진다");
    }
    if (await page.getByRole("dialog", { name: "환영합니다" }).count()) {
      problems.push("새 가족 만들기\n    닫은 환영 안내가 새로고침하면 또 뜬다");
    }
  });
});

/*
  만 14세가 안 된 보호자. 안내가 생년월일 칸 밑에만 있어 360×740 에서는 「다음」 단추 영역에,
  360×640 에서는 생년월일 칸째로 가려졌다. 단추 바로 위 안내 문구 자리에서 보여야 한다
*/
for (const viewport of [
  { width: 360, height: 640 },
  { width: 360, height: 740 },
]) {
  const where = `${viewport.width}×${viewport.height}`;
  await walk(
    `만 14세 안내 ${where}`,
    async (h) => {
      const { page } = h;
      await h.step("가족 없는 계정으로 가족 화면까지", async () => {
        await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
        await h.settle(2400);
        await page.getByRole("button", { name: /새 계정/ }).click();
        await h.until(/\/start\/family/);
      });
      await h.step("만 14세가 안 된 생년월일을 고른다", async () => {
        await page.getByLabel("가족 이름").fill("어린네");
        await page.getByLabel("보호자 이름").fill("하루");
        await page.getByRole("radio", { name: /여성/ }).click();
        await pickDate(page, "보호자 생년월일", "2015-03-01");
        await h.settle(400);
      });
      await h.step("화면을 맨 위로 올려도 안내가 가려지지 않고 보인다", async () => {
        const shown = await page.evaluate((copy) => {
          // 달력을 열려고 내린 자리가 아니라 처음 보는 자리에서도 보여야 한다
          for (const el of [document.scrollingElement, ...document.querySelectorAll("*")]) {
            if (el && el.scrollTop > 0) el.scrollTop = 0;
          }
          const nodes = [...document.querySelectorAll("p, span")].filter(
            (n) => n.children.length === 0 && n.textContent?.trim() === copy,
          );
          return nodes.some((n) => {
            const r = n.getBoundingClientRect();
            if (r.width === 0 || r.bottom <= 0 || r.top >= innerHeight) return false;
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return top != null && (top === n || n.contains(top));
          });
        }, "가족은 만 14세부터 만들 수 있어요");
        if (!shown) {
          problems.push(
            `만 14세 안내 ${where}\n    「가족은 만 14세부터 만들 수 있어요」 가 가려지거나 없다`,
          );
        }
        const locked = await page.getByRole("button", { name: "다음", exact: true }).isDisabled();
        if (!locked) problems.push(`만 14세 안내 ${where}\n    다음이 열려 있다`);
      });
    },
    viewport,
  );
}

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
    await page.getByLabel("초대 코드 여섯 자리").fill("K7M2QT");
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

/* ─── 3. 첫 시작 중간에 닫고 다시 열기, 새로고침 ──────────────────────────── */

await walk("중간에 닫아도 아이 없는 가족이 생기지 않고 두 번 만들지 않는다", async (h) => {
  const { page } = h;
  const next = async (name = "다음") => {
    await page.getByRole("button", { name, exact: true }).click();
    await h.settle(700);
  };
  const family = async () => {
    await page.getByLabel("가족 이름").fill("하늘네");
    await page.getByLabel("보호자 이름").fill("도현");
    await page.getByRole("radio", { name: /남성/ }).click();
    await pickDate(page, "보호자 생년월일", "1984-02-20");
    await next();
  };
  const child = async () => {
    await page.getByLabel("아이 이름").fill("하늘");
    await pickDate(page, "아이 생일", "2016-05-01");
    await page.getByRole("radio", { name: "남자아이" }).click();
    await next();
  };
  await h.step("가족과 아이 이름까지 적고 앱을 닫았다가 연다", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
    await h.settle(2400);
    await page.getByRole("button", { name: /새 계정/ }).click();
    await h.until(/\/start\/family/);
    await family();
    await child();
    await page.getByLabel("키").waitFor({ timeout: 8000 });
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await h.until(/\/start\//);
  });
  // 가족을 보호자 화면에서 먼저 만들 때는 여기서 아이 등록으로 곧장 갔다(아이 없는 가족을 막는 가드)
  await h.step("다시 열면 아이 등록이 아니라 가족 화면부터", async () => {
    if (/\/start\/child/.test(page.url())) {
      problems.push("중간에 닫기\n    다시 열었더니 아이 등록부터 묻는다");
    }
    await page.getByRole("heading", { name: /저는 키움이에요/ }).waitFor({ timeout: 10000 });
    if ((await page.getByRole("button", { name: "뒤로" }).count()) === 0) {
      problems.push("중간에 닫기\n    첫 화면에 나가는 길이 없다");
    }
  });
  await h.step("가족과 아이를 함께 만든다", async () => {
    await family();
    await child();
    await page.getByLabel("키").fill("132");
    await page.getByLabel("몸무게").fill("30");
    await page.getByRole("checkbox", { name: /개인정보 수집 및 이용에 동의/ }).click();
    await page.getByRole("checkbox", { name: /민감정보\(건강정보\) 처리에 동의/ }).click();
    await next();
    await page.getByRole("heading", { name: /언제 운동할 수 있어요/ }).waitFor({ timeout: 8000 });
  });
  await h.step("새로고침하면 그 아이로 이어 간다, 아이 이름부터 다시 묻지 않는다", async () => {
    await page.reload({ waitUntil: "load" });
    await h.settle(2000);
    await page
      .getByRole("heading", { name: /하늘은 언제 운동할 수 있어요/ })
      .waitFor({ timeout: 10000 });
    await page.getByRole("radio", { name: /매번 같이/ }).click();
    await next();
  });
  await h.step("지금 잴래요, 측정 화면 뒤로는 홈", async () => {
    await page.getByRole("heading", { name: "준비됐어요!" }).waitFor({ timeout: 8000 });
    await next("지금 잴래요");
    await h.until(/\/measure\?from=start/);
    await page.getByRole("link", { name: "뒤로" }).click();
    await h.until(/\/parent$/);
  });
  await h.step("아이는 한 명이다", async () => {
    await page.goto(`${BASE}/parent/family`, { waitUntil: "load" });
    await h.settle(2000);
    const kids = await page.getByText(/, 자녀/).count();
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
      const code = await page.getByLabel("초대 코드 여섯 자리").inputValue();
      if (code !== "K7M2QT") problems.push(`심사용 계정 — 초대\n    코드 칸이 「${code}」`);
    });
    await h.step("자리로 들어가 참여 방식까지", async () => {
      await page.getByRole("button", { name: /자리로 들어가기/ }).click();
      await h.until(/support-mode/);
    });
  },
  { width: 360, height: 780 },
);

/* ─── 5. 첫 시작 중간에 폰의 뒤로 ─────────────────────────── */

await walk("폰의 뒤로는 한 화면 앞으로", async (h) => {
  const { page } = h;
  const next = async (name = "다음") => {
    await page.getByRole("button", { name, exact: true }).click();
    await h.settle(700);
  };
  const back = async () => {
    await page.goBack({ waitUntil: "commit" }).catch(() => {});
    await h.settle(900);
  };
  await h.step("가족 화면을 적고 아이 화면으로 간다", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
    await h.settle(2400);
    await page.getByRole("button", { name: /새 계정/ }).click();
    await h.until(/\/start\/family/);
    await page.getByLabel("가족 이름").fill("바다네");
    await page.getByLabel("보호자 이름").fill("수진");
    await page.getByRole("radio", { name: /여성/ }).click();
    await pickDate(page, "보호자 생년월일", "1987-06-15");
    await next();
    await page.getByLabel("아이 이름").waitFor({ timeout: 8000 });
  });
  await h.step("뒤로를 누르면 가족 화면이고 적은 것이 남아 있다", async () => {
    await back();
    if (!/\/start\/family/.test(page.url())) {
      problems.push(`폰의 뒤로는 한 화면 앞으로\n    첫 시작 밖으로 나갔다: ${page.url()}`);
      return;
    }
    const name = await page.getByLabel("가족 이름").inputValue({ timeout: 8000 });
    if (name !== "바다네")
      problems.push(`폰의 뒤로는 한 화면 앞으로\n    적은 가족 이름이 사라졌다: 「${name}」`);
  });
  await h.step("다시 다음, 아이까지 적어 가족과 아이를 만든다", async () => {
    await next();
    await page.getByLabel("아이 이름").fill("바다");
    await pickDate(page, "아이 생일", "2016-07-01");
    await page.getByRole("radio", { name: "여자아이" }).click();
    await next();
    await page.getByLabel("키").fill("130");
    await page.getByLabel("몸무게").fill("28");
    await page.getByRole("checkbox", { name: /개인정보 수집 및 이용에 동의/ }).click();
    await page.getByRole("checkbox", { name: /민감정보\(건강정보\) 처리에 동의/ }).click();
    await next();
    await page.getByRole("heading", { name: /언제 운동할 수 있어요/ }).waitFor({ timeout: 8000 });
  });
  await h.step("가족과 아이를 만든 뒤 뒤로를 눌러도 운동 시간 화면에 남는다", async () => {
    await back();
    const stay = await page.getByRole("heading", { name: /언제 운동할 수 있어요/ }).count();
    if (!/\/start\/family/.test(page.url()) || stay === 0) {
      problems.push(
        `폰의 뒤로는 한 화면 앞으로\n    가족과 아이를 만든 뒤 뒤로가 앞 화면으로 갔다: ${page.url()}`,
      );
    }
  });
});

/* ─── 6. 새로고침한 뒤 폰의 뒤로 ─────────────────────────── */

await walk("새로고침 뒤 폰의 뒤로는 빈 앞 화면으로 가지 않는다", async (h) => {
  const { page } = h;
  const next = async (name = "다음") => {
    await page.getByRole("button", { name, exact: true }).click();
    await h.settle(700);
  };
  await h.step("가족 화면을 적고 아이 화면으로 간다", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30000 });
    await h.settle(2400);
    await page.getByRole("button", { name: /새 계정/ }).click();
    await h.until(/\/start\/family/);
    await page.getByLabel("가족 이름").fill("구름네");
    await page.getByLabel("보호자 이름").fill("민호");
    await page.getByRole("radio", { name: /남성/ }).click();
    await pickDate(page, "보호자 생년월일", "1985-11-02");
    await next();
    await page.getByLabel("아이 이름").waitFor({ timeout: 8000 });
  });
  await h.step("새로고침하면 적은 것이 사라지고 처음 화면이다", async () => {
    await page.reload({ waitUntil: "load" });
    await h.settle(2000);
  });
  await h.step("뒤로를 누르면 빈 가족 화면이 아니라 첫 시작 밖으로 나간다", async () => {
    await page.goBack({ waitUntil: "commit" }).catch(() => {});
    await h.settle(1200);
    if (/\/start\/family/.test(page.url()) && (await page.getByLabel("가족 이름").count()) > 0) {
      const name = await page.getByLabel("가족 이름").inputValue();
      problems.push(
        `새로고침 뒤 폰의 뒤로는 빈 앞 화면으로 가지 않는다\n    적은 것이 사라진 앞 화면으로 갔다: 가족 이름 「${name}」`,
      );
    }
  });
});

await browser.close();

if (problems.length > 0) {
  console.error("가입 경로 문제:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`가입 경로 여덟 갈래 · 단계 ${steps}개 이상 없음`);
