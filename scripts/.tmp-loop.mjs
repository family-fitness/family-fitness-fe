import { chromium } from "playwright";
const OUT = process.argv[2];
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).split("\n")[0]));
const step = async (name) => {
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  ${name} → ${new URL(p.url()).pathname}`);
};

console.log("1) 역할 고르기");
await p.goto("http://localhost:3001/start", { waitUntil: "load" });
await step("1-start");

console.log("2) 아이 고르기");
await p.getByRole("button", { name: /아이/ }).first().click();
await p.waitForTimeout(900);
await step("2-kid-home");

console.log("3) 오늘 할 운동 시작");
const play = p.getByRole("link", { name: /시작하기/ }).first();
if (await play.count()) {
  await play.click();
  await p.waitForTimeout(1200);
  await step("3-play");

  console.log("4) 다 했어요");
  await p.getByRole("button", { name: "다 했어요!" }).click();
  await step("4-done");

  console.log("5) 부모에게 알리기");
  await p.getByRole("button", { name: /알리기/ }).click();
  await p.waitForTimeout(900);
  await step("5-told");
} else {
  console.log("  (오늘 할 운동이 없어 건너뜀)");
}

console.log("6) 부모 화면으로");
await p.goto("http://localhost:3001/parent", { waitUntil: "load" });
await step("6-parent");

console.log("7) 도장 찍기");
const stampBtn = p.getByRole("button", { name: "도장 찍기" }).first();
if (await stampBtn.count()) {
  await stampBtn.click();
  await p.waitForTimeout(500);
  await step("7-picker");
  await p.getByRole("button", { name: "도장 찍어 주기" }).click();
  await p.waitForTimeout(2200);
  await step("8-stamped");
} else {
  console.log("  (찍을 대상이 없음 — 아이가 아직 운동 기록을 안 남김)");
}

console.log("9) 아이가 받은 도장 보기");
await p.goto("http://localhost:3001/kid/stamps", { waitUntil: "load" });
await step("9-stamps");

console.log(errs.length ? "오류:\n  " + [...new Set(errs)].join("\n  ") : "페이지 오류 없음");
await b.close();
