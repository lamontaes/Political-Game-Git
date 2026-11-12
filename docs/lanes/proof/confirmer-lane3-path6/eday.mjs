// Continues the same Storrs life (its save, Continue) from election morning:
// Go vote, mark the ballot, the returns stepped to the call, then every talk
// for the next three weeks, logged and photographed.
import { createRequire } from "node:module";
import { appendFileSync } from "node:fs";
const require = createRequire("/home/user/Political-Game-Git/package.json");
const { chromium } = require("playwright");
const [out, tag] = process.argv.slice(2);
const log = (...a) => { const l = a.map((x) => typeof x === "string" ? x : JSON.stringify(x)).join(" "); console.log(l); appendFileSync(`${out}/${tag}.log.txt`, l + "\n"); };
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = []; page.on("pageerror", (e) => errors.push(e.message));
let n = 100; const shot = (name) => page.screenshot({ path: `${out}/${tag}-${++n}-${name}.png` });
const vis = (s) => page.locator(s).first().isVisible().catch(() => false);
const date = async () => (await page.locator("#card-clock").innerText().catch(() => "")).replace(/\n/g, " ");
try {
  await page.goto("http://localhost:3000/play");
  await page.locator("#front-continue").click();
  await page.waitForFunction(() => document.getElementById("card-clock")?.textContent.trim());
  await page.waitForTimeout(2500);
  log("RESUMED", await date());
  await page.waitForTimeout(3000);
  if (!(await vis("#election-day:not([hidden])"))) await page.locator("#day").click({ timeout: 10000 }).catch(() => {});
  await page.locator("#election-day:not([hidden])").waitFor({ timeout: 120000 }).catch(() => {});
  if (await vis("#election-day:not([hidden])")) {
    log("MORNING", (await page.locator("#election-day").innerText()).replace(/\n+/g, " | "));
    await shot("morning");
    const skip = page.getByRole("button", { name: "Not today", exact: true });
    if (await skip.isVisible().catch(() => false)) { await skip.click(); await page.waitForTimeout(1500); }
    log("MORNING2", (await page.locator("#election-day").innerText()).replace(/\n+/g, " | "));
    await shot("choice");
    await page.getByRole("button", { name: "Go vote", exact: true }).click();
    await page.locator("#ballot:not([hidden])").waitFor();
    log("BALLOT", (await page.locator("#ballot").innerText()).replace(/\n+/g, " | ").slice(0, 1200));
    await shot("ballot");
    for (let i = 0; i < 40; i++) {
      if (!(await vis("#ballot:not([hidden])"))) break;
      const marked = await page.evaluate(() => { const b = document.querySelector("#ballot-races .acts button:not([disabled])"); if (b) { b.click(); return b.textContent; } return null; });
      if (!marked) break;
      log("MARKED", marked);
      await page.waitForTimeout(800);
    }
    await shot("ballot-marked");
    if (await vis("#ballot:not([hidden])")) await page.locator("#ballot-leave").click().catch(() => {});
  }
  for (let i = 0; i < 40 && !(await vis("#returns:not([hidden])")); i++) {
    if (await vis("#election-day:not([hidden])")) { for (const l of ["Not today", "Go vote", "Continue"]) { const b = page.getByRole("button", { name: l, exact: true }); if (await b.isVisible().catch(() => false)) { log("EDAY-BUTTON", l); await b.click().catch(() => {}); await page.waitForTimeout(1500); } } if (await vis("#ballot:not([hidden])")) { await page.evaluate(() => document.querySelector("#ballot-races .acts button:not([disabled])")?.click()); await page.waitForTimeout(800); await page.locator("#ballot-leave").click().catch(() => {}); } continue; }
    if (await vis("#talk")) { log("TALK", (await page.locator("#talk").innerText()).replace(/\n+/g, " | ").slice(0, 700)); await shot("talk"); }
    const later = page.getByRole("button", { name: "Not now", exact: true });
    if (await later.isVisible().catch(() => false)) await later.click().catch(() => {});
    else if (await vis("#talk-choices .reply")) await page.locator("#talk-choices .reply").first().click().catch(() => {});
    else if (await vis("#talk-next")) await page.locator("#talk-next").click().catch(() => {});
    else if (await vis("#talk-leave")) await page.locator("#talk-leave").click().catch(() => {});
    else if (await vis("#continue:not([hidden])")) await page.locator("#continue").click().catch(() => {});
    else await page.locator("#day").click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  await page.locator("#returns:not([hidden])").waitFor({ timeout: 300000 });
  log("RETURNS", await date(), (await page.locator("#returns").innerText()).replace(/\n+/g, " | "));
  await shot("returns-first");
  for (let i = 0; i < 40; i++) {
    if ((await page.locator("#returns-next").innerText()) === "Close") break;
    await page.locator("#returns-next").click();
    await page.waitForTimeout(300);
  }
  log("CALL", (await page.locator("#returns").innerText()).replace(/\n+/g, " | "));
  await shot("returns-call");
  await page.locator("#returns-next").click();
  // The night and the weeks after: every talk read, the first reply picked.
  let talks = 0;
  for (let i = 0; i < 160 && talks < 60; i++) {
    if (await vis("#talk")) {
      const who = await page.locator("#talk-name").innerText().catch(() => "");
      const lines = await page.locator("#talk-lines").innerText().catch(() => "");
      const replies = await page.locator("#talk-choices .reply").allInnerTexts().catch(() => []);
      talks++;
      log("NTALK", talks, await date(), JSON.stringify({ who, lines: lines.slice(-900), replies }));
      await shot(`night-${talks}`);
      if (replies.length) { log("NPICK", talks, replies[0]); await page.locator("#talk-choices .reply").first().click().catch(() => {}); }
      else if (await vis("#talk-next")) await page.locator("#talk-next").click().catch(() => {});
      else if (await vis("#talk-leave")) await page.locator("#talk-leave").click().catch(() => {});
      await page.waitForTimeout(900);
      continue;
    }
    if (await vis("#continue:not([hidden])")) { await page.locator("#continue").click().catch(() => {}); await page.waitForTimeout(1500); continue; }
    const d = await date();
    if (/November (2[5-9]|30)|December/.test(d)) break;
    await page.locator("#day").click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  log("END", await date());
  const gov = await page.evaluate(async () => (await (await fetch("/api/title")).json()));
  log("TITLE", JSON.stringify(gov).slice(0, 400));
} catch (e) { log("FAILURE", String(e?.stack ?? e).slice(0, 1200)); await shot("failure").catch(() => {}); }
log("ERRORS", errors);
await browser.close();
