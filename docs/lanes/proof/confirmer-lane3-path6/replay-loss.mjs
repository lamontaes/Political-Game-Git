/* global process, console, document, URL, fetch */
// Confirmer replay, Lane 3 Path 6 (the night you lose): New Game in Storrs,
// file for the town's race when it opens (Campaigns, File for it, the clerk),
// ask everyone you know to volunteer and call donors on the campaign trail,
// knock doors weekly while petitioning, then play week by week through
// election night. Every talk is logged and photographed.
// Usage: node replay-loss.mjs <state> <town> <replay> <outDir> <tag> [maxWeeks]
import { mkdirSync, appendFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/home/user/Political-Game-Git/package.json");
const { chromium } = require("playwright");
const { openCampaignTrail } = await import(
  "/home/user/Political-Game-Git/src/bench/campaign-trail.mjs"
);
const [stateName, townName, replay, outDir, tag, maxW] = process.argv.slice(2);
const maxWeeks = Number(maxW ?? 60);
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
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 500) log("HTTP", r.status(), new URL(r.url()).pathname);
});
await page.route("**/api/seed", (route) =>
  route.fulfill({ contentType: "application/json", body: JSON.stringify({ seed: replay }) }),
);
let shotNo = 0;
const shot = (name) =>
  page.screenshot({ path: `${outDir}/${tag}-${String(++shotNo).padStart(3, "0")}-${name}.png` });
const vis = (sel) => page.locator(sel).first().isVisible().catch(() => false);
const date = async () => (await page.locator("#card-clock").innerText().catch(() => "")).replace(/\n/g, " ");
let talkNo = 0;
let filed = false;
async function readTalk(label) {
  const who = await page.locator("#talk-name").innerText().catch(() => "");
  const lines = await page.locator("#talk-lines").innerText().catch(() => "");
  const replies = await page.locator("#talk-choices .reply").allInnerTexts().catch(() => []);
  talkNo += 1;
  log(label, talkNo, await date(), JSON.stringify({ who, lines: lines.slice(-900), replies }));
  if (filed) await shot(`talk-${talkNo}`);
  return replies;
}
async function settle() {
  for (let i = 0; i < 400; i += 1) {
    if (await vis("#talk")) {
      const replies = await readTalk("TALK");
      const reply = page.locator("#talk-choices .reply").first();
      if (replies.length) {
        log("PICK", talkNo, replies[0]);
        await reply.click({ timeout: 5000 }).catch(() => {});
      } else if (await vis("#talk-next")) await page.locator("#talk-next").click({ timeout: 5000 }).catch(() => {});
      else if (await vis("#talk-leave")) await page.locator("#talk-leave").click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(700);
      continue;
    }
    if (await vis("#election-day:not([hidden])")) {
      log("ELECTION-DAY", await date(), (await page.locator("#election-day").innerText().catch(() => "")).replace(/\n+/g, " | "));
      await shot("election-day");
      const vote = page.getByRole("button", { name: "Go vote", exact: true });
      const skip = page.getByRole("button", { name: "Not today", exact: true });
      if (await skip.count()) await skip.first().click({ timeout: 3000 }).catch(() => {});
      if (await vote.count()) await vote.first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
    if (await vis("#ballot:not([hidden])")) {
      log("BALLOT", (await page.locator("#ballot").innerText().catch(() => "")).replace(/\n+/g, " | ").slice(0, 800));
      await shot("ballot");
    }
    if (await vis("#election-night:not([hidden])")) {
      log("ELECTION-NIGHT", await date(), (await page.locator("#election-night").innerText().catch(() => "")).replace(/\n+/g, " | ").slice(0, 1500));
      await shot("election-night");
    }
    for (const label of ["Continue", "Not today", "Done", "Close", "Mark ballot", "Cast ballot", "Leave"]) {
      const b = page.getByRole("button", { name: label, exact: true });
      if ((await b.count()) && (await b.first().isVisible().catch(() => false))) {
        await b.first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
    }
    if (await page.locator("#week").isEnabled().catch(() => false)) return;
    await page.waitForTimeout(1000);
  }
  log("SETTLE-STUCK", await date());
  await shot("stuck");
}
async function closeSheet() {
  if (await vis("#sheet-close")) await page.locator("#sheet-close").click().catch(() => {});
  await page.waitForTimeout(400);
}
async function openCampaigns() {
  if (!(await vis('#sheet-tabs [data-tab="campaigns"]'))) {
    await page.locator('#rings [data-tab="politics"]').first().evaluate((e) => e.click());
    await page.locator("#sheet:not([hidden])").waitFor();
  }
  await page.locator('#sheet-tabs [data-tab="campaigns"]').click();
  await page.waitForTimeout(1500);
  return (await page.locator("#sheet").innerText()).replace(/\n+/g, " | ");
}
const gov = () => page.evaluate(async () => (await (await fetch("/api/government")).json()));
const races = () => page.evaluate(async () => (await (await fetch("/api/government/local-races")).json()));
async function openTrail() {
  await closeSheet();
  await page.locator('#rings [data-tab="travel"]').first().evaluate((e) => e.click());
  await page.locator("#sheet:not([hidden])").waitFor();
  await page.waitForTimeout(1000);
  const tile = page.locator("#sheet-body .entry", { hasText: "The campaign trail" }).first();
  await tile.waitFor({ timeout: 20000 });
  await tile.click();
  await page.locator("#sheet-body.place-view").waitFor();
  await page.waitForTimeout(800);
}
async function trail(acts) {
  await openTrail();
  const buttons = await page.locator("#sheet-body.place-view button").evaluateAll((n) => n.map((b) => `${b.textContent.trim()}${b.disabled ? " (off)" : ""}`));
  log("TRAIL", await date(), buttons.join(" | "));
  for (const re of acts) {
    const b = page.locator("#sheet-body.place-view button", { hasText: re }).first();
    if (!(await b.count()) || (await b.isDisabled())) { log("ACT-OFF", String(re)); continue; }
    const resp = page.waitForResponse((r) => /\/api\/campaign\/(act|day)/.test(new URL(r.url()).pathname), { timeout: 120000 }).catch(() => null);
    await b.click();
    const r = await resp;
    let body = null;
    try { body = r ? await r.json() : null; } catch { body = null; }
    log("ACT", String(re), JSON.stringify(body ?? {}).slice(0, 1500));
    await page.waitForTimeout(1000);
    await shot(`act-${String(re).replace(/[^a-z]/gi, "")}`);
    await settle();
    await openTrail();
  }
  await closeSheet();
}
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
  if (body.sceneMomentId) await page.locator("#talk").waitFor({ state: "visible", timeout: 60000 });
  await settle();
  let electionDate = null;
  let afterElection = 0;
  for (let w = 1; w <= maxWeeks; w += 1) {
    if (!filed) {
      const r = await races();
      const mine = (r.races ?? []).filter((x) => x.filingOpen && x.playerMayFile);
      if (mine.length) {
        const race = mine[0];
        log("FILING-OPEN", w, await date(), mine.map((x) => `${x.title} closes ${x.filingDeadline} election ${x.electionDate} via ${x.filedWith}`).join(" ; "));
        electionDate = race.electionDate;
        log("CAMPAIGNS", await openCampaigns());
        await shot("campaigns-open");
        await page.locator("#sheet-body").getByText(race.title, { exact: false }).first().click();
        await page.waitForTimeout(1200);
        log("RACEPAGE", (await page.locator("#sheet").innerText()).replace(/\n+/g, " | "));
        await shot("race-page");
        await page.locator('[data-testid="file-for-it"]').first().click();
        await page.waitForTimeout(2500);
        if (await vis('[data-testid="place-go"]')) await page.locator('[data-testid="place-go"]').click();
        await page.locator("#talk:not([hidden])").waitFor({ timeout: 30000 }).catch(() => {});
        filed = true;
        for (let step = 0; step < 40 && (await vis("#talk")); step += 1) {
          const replies = await readTalk("CLERK");
          if (replies.length) {
            const run = replies.findIndex((x) => x.toLowerCase().includes(race.title.toLowerCase().split(" ")[0]));
            const pick = run >= 0 ? run : 0;
            log("PICK-CLERK", replies[pick]);
            await page.locator("#talk-choices .reply").nth(pick).click();
          } else if (await vis("#talk-next")) await page.locator("#talk-next").click();
          else if (await vis("#talk-leave")) await page.locator("#talk-leave").click();
          await page.waitForTimeout(900);
        }
        await settle();
        const g = await gov();
        log("FILINGS", JSON.stringify(g.filings ?? []).slice(0, 1500));
        await trail([/volunteer/i, /Call donors/i]);
      }
    } else {
      const g = await gov();
      const f = (g.filings ?? [])[0];
      log("STATUS", w, await date(), f?.status ?? "none", JSON.stringify(f ?? {}).slice(0, 300));
      if (f?.status === "petitioning") await trail([/Knock on doors/i]);
    }
    if (electionDate && (await date()) && afterElection === 0) {
      const t = await page.evaluate(async () => (await (await fetch("/api/title")).json()).life?.date);
      if (t && t > electionDate) afterElection = w;
    }
    if (afterElection && w >= afterElection + 3) break;
    await page.locator("#week").click();
    await page.waitForTimeout(1500);
    await settle();
    log("WEEK", w, await date());
  }
  const g = await gov();
  log("END-FILINGS", JSON.stringify(g.filings ?? []).slice(0, 1500));
  log("CAMPAIGNS-END", await openCampaigns());
  await shot("campaigns-end");
} catch (e) {
  log("FAILURE", String(e?.stack ?? e).slice(0, 1500));
  await shot("failure").catch(() => {});
}
log("ERRORS", errors);
await browser.close();
