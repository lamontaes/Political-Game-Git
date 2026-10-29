/* global console, document, process, URL, URLSearchParams, fetch */
// The opening box, the player dossier, the speech panel and the debate panel are built from
// the shared parts in src/bench/ui/ (owner, Oct 26: one UI). Run against the bench (npm run
// bench) at 1440x900 in a drawn place; a grown resident files for the first office the
// records allow. Screenshots go to FOUR_SHOTS (default docs/reports/four-screens-2026-10-27).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
const shots = process.env.FOUR_SHOTS ?? "docs/reports/four-screens-2026-10-27";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const settle = async () => {
  await page.waitForFunction(() =>
    [...document.querySelectorAll("img")].every((i) => i.complete),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
};
try {
  // The debate the outlet would invite the player to: added to the campaign view, since
  // invitations depend on the season. Its questions are two of the game's own policy names.
  await page.route("**/api/campaign?*", async (route) => {
    const response = await route.fetch();
    const view = await response.json();
    const names = Object.keys(
      (await (await fetch(`${base}/api/controls`)).json()).policyNames ?? {},
    );
    for (const c of view.campaigns ?? [])
      c.debates = [
        {
          id: "debate-check",
          date: "2026-10-20",
          questions: names.slice(0, 2),
        },
      ];
    await route.fulfill({ response, json: view });
  });
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  // A drawn world through New world: the opening plays, and the town's people are there.
  const life = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 300000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const response = await life;
  assert.equal(response.status(), 200);
  console.log("Seed:", new URL(response.url()).searchParams.get("seed"));

  // The opening box: the speaker head and the line, the talk box's own parts.
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 120000 });
  await page.locator("#opening-speech li.speech").waitFor();
  await settle();
  assert.equal(await page.locator("#opening-box #opening-who.who").count(), 1);
  assert.equal(
    await page.locator("#opening-box .speech.talk-lines").count(),
    0,
  );
  assert.ok((await page.locator("#opening-name").innerText()).trim());
  assert.ok((await page.locator("#opening-speech").innerText()).trim());
  await page.screenshot({ path: `${shots}/opening-box.png` });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());

  // The dossier: panel head, side figure and sections from the shared parts.
  const figure = page.locator("#people .talkable").first();
  await figure.waitFor();
  await figure.focus();
  await page.keyboard.press("Enter");
  // The talk opens; the person's name in it opens their card.
  await page.locator("#talk:not([hidden])").waitFor();
  await page.locator("#talk-name").click();
  await page.locator("#person:not([hidden])").waitFor();
  await settle();
  assert.equal(
    await page.locator("#person .sheet-head #person-name").count(),
    1,
  );
  assert.equal(
    await page.locator("#person .sheet-head #person-close").count(),
    1,
  );
  assert.equal(await page.locator("#person-media.screen-media").count(), 1);
  assert.equal(
    await page.locator(".dossier-detail, .dossier-media").count(),
    0,
  );
  assert.ok((await page.locator("#person-name").innerText()).trim());
  await page.screenshot({ path: `${shots}/dossier.png` });
  await page.locator("#person-close").click();

  // Campaigns: a grown resident (born 1980) in a drawn world files for the first office the
  // records allow.
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const campaignSeed = (
    await (await page.request.get(`${base}/api/seed`)).json()
  ).seed;
  const made = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ seed: campaignSeed, date: "2026-10-12", person })}`,
    { timeout: 300000 },
  );
  assert.equal(made.status(), 200);
  console.log("Campaign seed:", campaignSeed);
  await page.reload();
  await page.locator("#front-continue").waitFor();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Campaign place:", await page.locator("#card-place").innerText());

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
        ["petitioning", "on-ballot"].includes(body.filing?.status ?? "")
      )
        return contest.id;
    }
    return null;
  });
  assert.ok(filed, "the player could file for nothing in this town");
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Campaigns", exact: true })
    .click();
  await page.locator(".row.campaign").first().waitFor();

  // The debate: a tab for each position on each question, one chosen at a time.
  const bars = page.locator(".row.campaign nav.tabs");
  assert.equal(await bars.count(), 2, "two questions, two position bars");
  assert.equal(
    await page.locator(".row.campaign:has(nav.tabs) select").count(),
    0,
    "no select in the debate",
  );
  const against = bars.first().locator('[data-position="-1"]');
  await against.click();
  assert.equal(await against.getAttribute("aria-pressed"), "true");
  assert.equal(
    await bars
      .first()
      .locator('[data-position="null"]')
      .getAttribute("aria-pressed"),
    "false",
  );
  await settle();
  await page.screenshot({ path: `${shots}/debate.png` });

  // The speech: parts said are talk lines, the four on offer are numbered replies.
  await page
    .getByRole("button", { name: "Give a speech", exact: true })
    .click();
  await page.locator(".talk-sheet .replies .reply").first().waitFor();
  assert.equal(await page.locator(".talk-sheet .replies .reply").count(), 4);
  await settle();
  await page.screenshot({ path: `${shots}/speech-begin.png` });
  for (let part = 0; part < 4; part += 1) {
    const said = await page.locator(".talk-sheet .talk-lines li").count();
    // A long Campaigns screen pages: the replies may be on the next page, as for a player.
    const next = page.locator("#sheet-pager button:visible").last();
    if (
      !(await page
        .locator(".talk-sheet .replies .reply")
        .first()
        .isVisible()) &&
      (await next.count())
    )
      await next.click();
    await page.locator(".talk-sheet .replies .reply").first().click();
    await page.waitForFunction(
      (n) => document.querySelectorAll(".talk-sheet .talk-lines li").length > n,
      said,
    );
    if (!(await page.locator(".talk-sheet .replies .reply").count())) break;
  }
  const give = page.locator("#sheet-body button", {
    hasText: /^Give the speech$/,
  });
  await give.waitFor({ state: "attached" });
  const onward = page.locator("#sheet-pager button:visible").last();
  if (!(await give.isVisible()) && (await onward.count())) await onward.click();
  await give.waitFor();
  await settle();
  await page.screenshot({ path: `${shots}/speech-built.png` });
  assert.deepEqual(errors, []);
  console.log(
    "PASS opening box, dossier, debate and speech panels from the shared parts",
  );
} catch (error) {
  console.log("PAGE ERRORS", errors);
  throw error;
} finally {
  await browser.close();
}
