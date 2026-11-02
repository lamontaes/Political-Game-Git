/* global process, URL, URLSearchParams, console, document, fetch */
// A poll is a scene (owner: every campaign act is a scene): the
// outlet with the player at it, then what the buy cost and how many it reached. Usage: SEED=<seed> node src/bench/poll-briefing.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { openCampaignTrail } from "./campaign-trail.mjs";

const shots = process.argv[2];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/play`);
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const seed =
    process.env.SEED ??
    (await (await page.request.get(`${base}/api/seed`)).json()).seed;
  await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed, date: "2026-10-12", person })}`,
    { timeout: 300000 },
  );
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log(
    "Seed:",
    seed,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  const filed = await page.evaluate(async () => {
    const gov = await (await fetch("/api/government")).json();
    for (const { contest } of gov.contests ?? []) {
      const r = await fetch(
        `/api/file?${new URLSearchParams({ contestId: contest.id })}`,
        { method: "POST" },
      );
      const body = await r.json().catch(() => ({}));
      if (
        r.ok &&
        body.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(body.filing?.status)
      )
        return body.filing.id;
    }
    return null;
  });
  assert.ok(filed, "the player could file for nothing in this town");
  // The campaign holds nothing yet: no poll can be paid for, and the pollster says so.
  await openCampaignTrail(page);
  const buy = async () => {
    const ask = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/campaign/act",
    );
    await page
      .locator("#sheet-body.place-view button", { hasText: /^Poll$/ })
      .evaluate((e) => e.click());
    const result = await (await ask).json();
    await page.locator("#talk:visible").waitFor();
    await page.waitForTimeout(900);
    return {
      result,
      text: (await page.locator("#talk-lines").innerText()).trim(),
    };
  };
  const none = await buy();
  assert.equal(none.result.contacted, 0);
  assert.equal(none.text, none.result.line);
  assert.match(none.text, /pollster/);
  // The player puts money in, then buys: the briefing names the date, how many were asked and the tally.
  await openCampaignTrail(page);
  const put = await page.request.post(
    `${base}/api/campaign/act?${new URLSearchParams({ filingId: filed, kind: "contribute", amountMinor: "100000" })}`,
  );
  assert.equal(put.status(), 200);
  // Leave the card and come back, so it shows what the campaign holds now.
  await page.locator('#rings [data-tab="calendar"]').click();
  await openCampaignTrail(page);
  console.log(JSON.stringify(await page.locator("#sheet-body.place-view button").evaluateAll((b) => b.map((x) => [x.textContent.slice(0, 30), x.disabled]))), await page.locator("#sheet-body").innerText().then((t) => t.slice(0, 120)));
  const bought = await buy();
  assert.ok(bought.result.contacted > 0, "the poll asked nobody");
  assert.equal(bought.text, bought.result.line);
  assert.match(bought.text, /poll/);
  assert.ok(bought.text.includes(String(bought.result.contacted)), bought.text);
  console.log("Bought:", bought.text);
  if (shots) await page.screenshot({ path: `${shots}/poll-1-1440x900.png` });
  console.log("No money:", none.text);
  assert.deepEqual(errors, []);
  console.log("poll briefing: pass");
} finally {
  await browser.close();
}
