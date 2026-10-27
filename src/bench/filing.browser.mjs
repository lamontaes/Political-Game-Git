/* global process, console, document, URL, URLSearchParams */
// The filing counter in a real browser, on the bench (npm run bench): a new
// life in a place drawn from all 56, Travel to the first office that takes
// filings, name each office there. The choices must read differently, the
// overlay's rules must read as words from the controls data (never a rule's
// id), the overlay must fit the window and nothing may cover it.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { checkRuleLabels } from "./filing-rule-labels.mjs";
// The first race at the counter: a row of the race menu when there are more than
// four, else the first reply in the talk.
async function pickFirstRace(page) {
  const menu = page.locator("#race-menu .choice").first();
  if (await menu.isVisible()) await menu.click();
  else await page.locator("#talk-choices button").first().click();
}
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
page.on("pageerror", (e) => errors.push(e.message));
async function openNavigationTab(tab) {
  // The rail over the card, or the Menu list when a screen is open (the rail steps aside).
  const rail = page.locator(`#rings [data-tab="${tab}"]`);
  const button = (await rail.isVisible())
    ? rail
    : page.locator(`#menu [data-tab="${tab}"]`);
  await button.focus();
  assert.ok(
    await button.evaluate((node) => node === document.activeElement),
    "the navigation button did not receive keyboard focus",
  );
  await page.keyboard.press("Enter");
  await page.locator("#sheet:not([hidden])").waitFor();
}
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  // SEED=<seed> replays a drawn world: the new-life request carries it.
  if (process.env.SEED)
    await page.route("**/api/newlife?*", (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("seed", process.env.SEED);
      return route.continue({ url: url.toString() });
    });
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  await page.locator("#new-world").click();
  const asked = new URL((await made).url()).searchParams;
  const world = { seed: asked.get("seed"), date: asked.get("date") };
  console.log("Seed:", world.seed);
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 300000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  // Travel to the first place where filings are taken.
  await openNavigationTab("travel");
  const go = page.locator("#sheet-body button", { hasText: /Go/ });
  await go.first().waitFor();
  const controlsResponse = await page.request.get(`${base}/api/controls`);
  assert.ok(controlsResponse.ok(), "the controls data did not load");
  const controls = await controlsResponse.json();
  let opened = false;
  for (let i = 0; i < (await go.count()) && !opened; i++) {
    const label = await go.nth(i).getAttribute("aria-label");
    await go.nth(i).click();
    opened = await page
      .locator("#talk:not([hidden])")
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (opened) console.log("Office:", label);
  }
  assert.ok(opened, "no place in Travel takes filings");
  const choices = await page.locator("#talk-choices button").allInnerTexts();
  console.log("Choices:", choices.join(" | "));
  assert.equal(
    new Set(choices).size,
    choices.length,
    "two choices read the same",
  );
  await pickFirstRace(page);
  await page.locator("#filing-overlay:not([hidden])").waitFor();
  // The rules read as words, never as a rule's id.
  const labels = await page
    .locator("#filing-checks .row > :first-child")
    .allInnerTexts();
  console.log("Rules:", labels.join(" | "));
  checkRuleLabels(labels, controls);
  // The overlay fits the window, and the news card is not over it.
  const box = await page.locator("#filing-overlay").boundingBox();
  assert.ok(
    box.y >= 0 && box.y + box.height <= 900,
    "the overlay runs off the screen",
  );
  assert.ok(
    !(await page.locator("#news-surface").isVisible()),
    "the news card is showing over the counter",
  );
  // The party picker and every stand can be reached: scrolled into view,
  // nothing else on top of them.
  const covered = await page.evaluate(() =>
    [
      ...document.querySelectorAll("#filing-platform select"),
      document.getElementById("filing-party"),
    ]
      .filter(Boolean)
      .filter((control) => {
        control.scrollIntoView({ block: "nearest" });
        const r = control.getBoundingClientRect();
        const top = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        );
        return !(top === control || control.contains(top));
      })
      .map((control) => control.name || control.id),
  );
  assert.deepEqual(covered, [], "a stand or the party picker is covered");
  await page.screenshot({
    path: "docs/reports/filing-overlay-2026-10-24/overlay.png",
  });
  await page.locator("#talk-leave").click();
  await page
    .locator("#filing-overlay")
    .waitFor({ state: "hidden", timeout: 10000 })
    .catch(() => assert.fail("the overlay stays after leaving"));
  // A grown resident of the same world joins a party, picks two stands with
  // the mouse and files: the filing keeps exactly that party and those stands.
  const person = JSON.stringify({
    givenName: "Pat",
    familyName: "Candidate",
    gender: "nonbinary",
    birthYear: 1980,
    birthMonth: 6,
    birthDay: 15,
  });
  const adult = await page.request.post(
    `${base}/api/newlife?${new URLSearchParams({ ...world, person })}`,
    { timeout: 600000 },
  );
  assert.equal(adult.status(), 200);
  await page.reload();
  await page.locator("#front-continue").click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  // Join a party on Politics, as a player does; the form then starts on it.
  await openNavigationTab("politics");
  // Three honest cases: parties on offer (join the first), already a member
  // (use that party; the screen shows membership, not Join), or no party in
  // this place (run as an independent).
  const join = page.locator("#sheet-body button", { hasText: /^Join / });
  const member = page.locator("#sheet-body [data-party-id]");
  const shown = await join
    .first()
    .or(member.first())
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  let joined = "";
  if (shown && (await join.count())) {
    joined = (await join.first().innerText()).replace(/^Join /, "");
    const joining = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/party/join",
    );
    await join.first().click();
    await joining;
    console.log("Joined:", joined);
  } else if (shown) {
    const line = await member.first().locator(".record-value").innerText();
    joined = line.split(" · ")[0].trim();
    console.log("Already a member of:", joined);
  } else {
    console.log("No party on offer in this place: filing as independent");
  }
  await openNavigationTab("travel");
  const goAgain = page.locator("#sheet-body button", { hasText: /Go/ });
  await goAgain.first().waitFor();
  let atCounter = false;
  for (let i = 0; i < (await goAgain.count()) && !atCounter; i++) {
    await goAgain.nth(i).click();
    atCounter = await page
      .locator("#talk:not([hidden])")
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
  }
  assert.ok(atCounter, "no place in Travel takes filings");
  await pickFirstRace(page);
  await page.locator("#filing-overlay:not([hidden])").waitFor();
  // The party the form starts on: the one the resident belongs to, or none
  // (an independent); filing under a party they never joined is refused.
  const party = await page.locator("#filing-party").inputValue();
  assert.equal(party, joined, "the form does not start on the party joined");
  if (!joined)
    assert.equal(party, "", "an independent's form starts on a party");
  const stands = page.locator("#filing-platform select");
  await stands.first().waitFor();
  const picked = [];
  for (const [i, value] of [
    [0, "1"],
    [1, "-1"],
  ]) {
    if (i >= (await stands.count())) break;
    const stand = stands.nth(i);
    await stand.scrollIntoViewIfNeeded();
    await stand.selectOption(value);
    picked.push(`${await stand.getAttribute("name")}=${value}`);
  }
  assert.ok(picked.length > 0, "no stand could be picked on the form");
  const filed = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/filing/choose",
  );
  await page.locator("#talk-choices button").first().click();
  const result = (await (await filed).json()).result;
  console.log(
    "Filed:",
    JSON.stringify({
      party: result?.filing?.party,
      platform: result?.filing?.platform,
      picked: { party, stands: picked },
    }),
  );
  assert.equal(
    result?.filing?.status,
    "on-ballot",
    `the filing was refused: ${JSON.stringify(result?.unmet ?? result)}`,
  );
  assert.equal(result.filing.party ?? "", party, "the filed party differs");
  assert.deepEqual(
    [...result.filing.platform].sort(),
    [...picked].sort(),
    "the filed platform differs from the stands picked",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS the filing counter's choices, rules, fit and news card; the filing keeps the party and stands picked",
  );
} finally {
  await browser.close();
}
