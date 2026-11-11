// Hearing how a race came out: SEED, OUT, TAG.
import { chromium } from "playwright";
import fs from "node:fs";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const { SEED, OUT, TAG } = process.env;
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BENCH_BROWSER });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const log = [];
const say = (s) => { log.push(s); console.log(s); };
const shot = (name) => page.screenshot({ path: `${OUT}/${SEED}-${TAG}-${name}.png` });
const talk = async () => (await page.locator("#talk").innerText()).replace(/\n+/g, " / ");
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const person = JSON.stringify({ givenName: "Pat", familyName: "Voter", gender: "nonbinary", birthYear: 1975, birthMonth: 6, birthDay: 15 });
  const params = new URLSearchParams({ seed: SEED, ...(process.env.PLACE ? { placeKey: process.env.PLACE } : { person }) });
  const made = await page.request.post(`${base}/api/newlife?${params}`, { timeout: 900000 });
  if (made.status() !== 200) throw new Error(`newlife ${made.status()}`);
  // Dev mode's month step to just before the election (the world runs; the player's own days are played after).
  for (let m = 0; m < Number(process.env.MONTHS ?? 0); m++)
    await page.request.post(`${base}/api/dev/advance`, { data: { step: "month" }, timeout: 900000 });
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() => document.getElementById("card-name").textContent.trim());
  say(`Seed ${SEED}; place: ${await page.locator("#card-place").innerText()}`);
  let found = false;
  for (let step = 0; step < 900 && !found; step++) {
    const day = await page.locator("#card-clock").first().innerText().catch(() => "");
    if (step % 5 === 0) say(`step ${step} ${day.replace(/\n/g, " ")}`);
    if (/November 4/.test(day)) {
      globalThis.stuck = (globalThis.stuck ?? 0) + 1;
      if (globalThis.stuck === 12) {
        await shot("stuck");
        say("STUCK " + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("button,[role=button],input,select")].filter((b) => b.offsetParent).map((b) => `${b.tagName}#${b.id}.${b.className}|${(b.textContent || b.value || "").trim().slice(0, 40)}`))));
        say("TEXT " + (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 800));
        throw new Error("stuck on election day");
      }
    }
    if (/November 4/.test(day) && !globalThis.shotStuck) { globalThis.shotStuck = 1; await shot("election-day"); say("BUTTONS " + JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.offsetParent).map((b) => `${b.id}|${b.textContent.trim().slice(0, 30)}`)))); }
    // Election day asks first: the player goes to vote.
    const vote = page.getByRole("button", { name: /^(Go vote|Vote|Cast (?:my|your) ballot|Done)$/ });
    if (await vote.first().isVisible().catch(() => false)) {
      say(`Election day: ${(await vote.first().innerText()).trim()}`);
      await vote.first().click().catch(() => {});
      await page.waitForTimeout(2500);
      continue;
    }
    // The ballot: the first name in each race, then leave the booth.
    const choices = page.locator(".ballot-choice:visible");
    if (await choices.count()) {
      const texts = await choices.allInnerTexts();
      for (let i = 0; i < texts.length; i++)
        if (i === 0 || /^Leave blank$/.test(texts[i - 1].trim()))
          await choices.nth(i).click().catch(() => {});
      say(`Ballot: ${texts.filter((t, i) => i === 0 || /^Leave blank$/.test(texts[i - 1].trim())).join(", ")}`);
      await page.waitForTimeout(1500);
      if (await page.locator("#ballot-leave:visible").count()) await page.locator("#ballot-leave").click().catch(() => {});
      await page.waitForTimeout(2500);
      continue;
    }
    const visible = await page.locator("#talk:not([hidden])").count();
    const replies = visible ? await page.locator("#talk-choices button").allInnerTexts() : [];
    const name = visible ? (await page.locator("#talk-name").innerText().catch(() => "")).trim() : "";
    if (process.env.DEBUG && visible) say(`step ${step}: [${name}] ${visible ? (await talk()).slice(0, 200) : "-"}`);
    if (visible && replies.length > 1 && !/^(Continue|Leave)$/.test(replies[0].trim())) {
      const text = await talk();
      if (/\bwon (?:the|by|it)\b|the count\b/i.test(text) && !/run for|file for/i.test(text)) {
        found = true;
        say(`Told: ${text}`);
        await shot("1-told");
        const ask = replies.findIndex((t) => /\?\s*$/.test(t.trim()));
        await page.locator("#talk-choices button").nth(ask >= 0 ? ask : 0).click();
        await page.waitForTimeout(1500);
        say(`Answer: ${await talk()}`);
        await shot("2-answer");
        break;
      }
    }
    if (visible && (await page.locator("#talk-next:visible, #talk-choices button:visible").count())) {
      await page.waitForTimeout(1500);
      await page.locator("#talk-next:visible, #talk-choices button:visible").first().click().catch(() => {});
    } else if (await page.locator(process.env.STEP ?? "#week:enabled").count()) {
      await page.locator(process.env.STEP ?? "#week").click().catch(() => {});
      await page.locator("#talk:not([hidden])").waitFor({ timeout: 8000 }).catch(() => {});
    } else if (await page.locator("#continue:visible").count()) await page.locator("#continue").click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  if (!found) say("No race told on screen.");
} catch (e) { say(`ERROR ${e.message}`); process.exitCode = 1; }
finally { fs.writeFileSync(`${OUT}/${SEED}-${TAG}.txt`, log.join("\n") + "\n"); await browser.close(); }
