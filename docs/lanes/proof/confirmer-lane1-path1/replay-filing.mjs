/* global process, console, document, URL, fetch */
// Confirmer replay, Lane 1 Path 1 (one race, one deadline): New Game in one
// town as an adult, then the Week button week by week. Each week the
// Campaigns screen's own feed (/api/government/local-races) is logged; the
// Campaigns screen is captured on the first day, the first week a race
// offers File for it, and the week after filing closes. When a race opens,
// File for it is pressed and the clerk's words are read and captured.
// Usage: node replay-filing.mjs <state> <town> <replay> <outDir> <tag> [maxWeeks]
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/home/user/Political-Game-Git/package.json");
const { chromium } = require("playwright");
const { playOpening, finishTalk } = await import(
  "/home/user/Political-Game-Git/src/bench/start-life.mjs"
);
const [stateName, townName, replay, outDir, tag, maxW] = process.argv.slice(2);
const maxWeeks = Number(maxW ?? 45);
mkdirSync(outDir, { recursive: true });
const log = (...a) => {
  const line = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
  console.log(line);
  appendFileSync(`${outDir}/${tag}.log.txt`, line + "\n");
};
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 500) log("HTTP", r.status(), new URL(r.url()).pathname);
});
await page.route("**/api/seed", (route) =>
  route.fulfill({ contentType: "application/json", body: JSON.stringify({ seed: replay }) }),
);
const shot = (name) => page.screenshot({ path: `${outDir}/${tag}-${name}.png` });
const vis = (sel) => page.locator(sel).isVisible().catch(() => false);
const date = () => page.locator("#card-clock").innerText().catch(() => "");
async function settle() {
  for (let i = 0; i < 400; i += 1) {
    if (await vis("#talk")) {
      // As a player: answer with the first reply, else Continue, else Leave.
      const reply = page.locator("#talk-choices .reply").first();
      if (await reply.isVisible().catch(() => false)) await reply.click().catch(() => {});
      else if (await vis("#talk-next")) await page.locator("#talk-next").click().catch(() => {});
      else if (await vis("#talk-leave")) await page.locator("#talk-leave").click().catch(() => {});
      await page.waitForTimeout(700);
      continue;
    }
    for (const label of ["Continue", "Not today", "Done", "Close"]) {
      const b = page.getByRole("button", { name: label, exact: true });
      if ((await b.count()) && (await b.first().isVisible())) {
        await b.first().click();
        await page.waitForTimeout(500);
      }
    }
    if (await page.locator("#week").isEnabled().catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
}
async function openCampaigns() {
  if (!(await vis('#sheet-tabs [data-tab="campaigns"]'))) {
    await page.locator('#rings [data-tab="politics"]').first().evaluate((e) => e.click());
    await page.locator("#sheet:not([hidden])").waitFor();
  }
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.waitForTimeout(1500);
  return page.locator("#sheet").innerText();
}
async function closeSheet() {
  if (await vis("#sheet-close")) await page.locator("#sheet-close").click();
  await page.waitForTimeout(400);
}
const races = () =>
  page.evaluate(async () => (await (await fetch("/api/government/local-races")).json()));
try {
  const titled = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await titled;
  await page.locator("#new-life").click();
  await page.locator("#new-start").click();
  await page.locator('[data-testid="gender-female"]').click();
  await page.locator("#cr-given").fill("Emily");
  await page.locator("#cr-family").fill("Carter");
  await page.locator("#cr-month").selectOption({ index: 3 });
  await page.locator("#cr-day").selectOption({ index: 9 });
  await page.waitForFunction(() => document.getElementById("cr-year").options.length > 1);
  await page.locator("#cr-year").selectOption("1985");
  await page.locator("#cr-character-next").click();
  await page.locator("#cr-states .item").first().waitFor();
  await page.locator("#cr-state-search").fill(stateName);
  await page.locator("#cr-states .item", { hasText: stateName }).first().click();
  await page.locator("#cr-towns .item").first().waitFor();
  await page.locator("#cr-town-search").fill(townName);
  await page.waitForTimeout(1500);
  await page.locator("#cr-towns .item", { hasText: townName }).first().click();
  const made = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/newlife", { timeout: 900000 });
  await page.locator("#cr-begin").click();
  const response = await made;
  const body = await response.json();
  log("NEWLIFE", response.url());
  log("PLACE", body.placeName, "PERSON", body.personId);
  await page.waitForFunction(() => document.getElementById("card-name")?.textContent.trim());
  await playOpening(page, body.sceneMomentId ?? null);
  await settle();
  log("DAY0", await date());
  log("CAMPAIGNS0", (await openCampaigns()).replace(/\n+/g, " | ").slice(0, 1500));
  await shot("0-campaigns-first-day");
  await closeSheet();
  let opened = null;
  let closedShot = false;
  for (let w = 1; w <= maxWeeks; w += 1) {
    await page.locator("#week").click();
    await page.waitForTimeout(1500);
    await settle();
    const r = await races();
    const list = (r.races ?? r.contests ?? r).map
      ? (r.races ?? r.contests ?? r)
      : [];
    const open = list.filter((x) => x.filingOpen);
    const gov = await page.evaluate(async () => (await (await fetch("/api/government")).json()));
    const offered = (gov.contests ?? []).map((c) => `${c.contest.title ?? c.contest.contestId ?? ""} [${c.contest.filingOpens} to ${c.contest.filingDeadline}]`);
    log("OFFERED", w, offered.length, offered.join(" ; ").slice(0, 600), "next", JSON.stringify(gov.nextFiling ?? null).slice(0, 300));
    const mine = open.filter((x) => x.playerMayFile);
    if (offered.length && !opened) {
      opened = { week: w, offered };
      log("OPENED", opened);
      log("CAMPAIGNS", (await openCampaigns()).replace(/\n+/g, " | ").slice(0, 2500));
      await shot("1-campaigns-in-window");
      await closeSheet();
      await page.locator('#rings [data-tab="travel"]').first().evaluate((e) => e.click());
      await page.waitForTimeout(2000);
      log("TRAVEL", (await page.locator("#sheet").innerText()).replace(/\n+/g, " | "));
      await shot("2-travel-in-window");
      await page.locator("#sheet").getByText("›", { exact: true }).last().click().catch(() => {});
      await page.waitForTimeout(1000);
      log("TRAVEL2", (await page.locator("#sheet").innerText()).replace(/\n+/g, " | "));
      await shot("3-travel-2-in-window");
      await closeSheet();
      await page.locator('#rings [data-tab="politics"]').first().evaluate((e) => e.click());
      await page.waitForTimeout(2000);
      log("GOVERNMENT", (await page.locator("#sheet").innerText()).replace(/\n+/g, " | ").slice(0, 3000));
      await shot("4-government-in-window");
      await closeSheet();
      break;
    }
    log(
      "WEEK", w, await date(),
      "races", list.length, "open", open.length, "mayFile", mine.length,
      mine.map((x) => `${x.title} closes ${x.filingDeadline} via ${x.filedWith}`).join(" ; "),
    );
    if (w === 1) log("RACEKEYS", Object.keys(list[0] ?? {}));
    if (!opened && mine.length) {
      opened = { week: w, date: await date(), mine };
      log("OPENED", opened);
      log("CAMPAIGNS", (await openCampaigns()).replace(/\n+/g, " | ").slice(0, 2500));
      await shot("1-campaigns-filing-open");
      // Open each race row that offers filing, as a player clicks it.
      const rowTitles = mine.map((x) => x.title);
      for (const t of rowTitles.slice(0, 3)) {
        const row = page.locator("#sheet-body").getByText(t, { exact: false }).first();
        if (await row.count()) {
          await row.click();
          await page.waitForTimeout(1200);
          log("RACEPAGE", (await page.locator("#sheet").innerText()).replace(/\n+/g, " | ").slice(0, 1200));
          await shot("2-race-page");
        }
      }
      const fileBtn = page.locator('[data-testid="file-for-it"]').first();
      if (await fileBtn.count()) {
        await fileBtn.click();
        await page.waitForTimeout(3000);
        await shot("3-after-file-for-it");
        if (await vis('[data-testid="place-go"]')) {
          await page.locator('[data-testid="place-go"]').click();
          await page.waitForTimeout(2000);
        }
        // The clerk: read every line until replies show; record them all.
        const lines = [];
        for (let i = 0; i < 40 && (await vis("#talk")); i += 1) {
          lines.push(await page.locator("#talk-lines").innerText().catch(() => ""));
          await shot(`4-clerk-${i}`);
          const replies = await page.locator("#talk-choices .reply").allInnerTexts();
          if (replies.length) {
            log("CLERK-REPLIES", replies);
            const file = page.locator("#talk-choices .reply", { hasText: /file|run/i }).first();
            if (await file.count()) await file.click();
            else await page.locator("#talk-choices .reply").first().click();
          } else if (await vis("#talk-next")) await page.locator("#talk-next").click();
          else if (await vis("#talk-leave")) await page.locator("#talk-leave").click();
          await page.waitForTimeout(1200);
        }
        log("CLERK-LINES", lines.at(-1) ?? "");
        await settle();
        const gov = await page.evaluate(async () => (await (await fetch("/api/government")).json()));
        log("FILINGS", gov.filings ?? null);
        log("CAMPAIGNS-AFTER", (await openCampaigns()).replace(/\n+/g, " | ").slice(0, 2500));
        await shot("5-campaigns-after-filing");
        await closeSheet();
      }
    }
    if (opened && !closedShot && open.length === 0) {
      closedShot = true;
      log("CLOSED", w, await date());
      log("CAMPAIGNS-CLOSED", (await openCampaigns()).replace(/\n+/g, " | ").slice(0, 2500));
      await shot("6-campaigns-filing-closed");
      await closeSheet();
      break;
    }
  }
} catch (e) {
  log("FAILURE", String(e?.stack ?? e));
  await shot("x-failure").catch(() => {});
}
log("ERRORS", errors);
await browser.close();
