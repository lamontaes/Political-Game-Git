/* global process, console, document, URL, URLSearchParams */
// Budgets wait until they are the player's business: a new life at 17, with
// no office and no filing, has no Budgets tab under Politics. A grown
// resident of the same world who files sees the tab, and its sums read in a
// rounded unit ("$5.2 trillion"), never to the cent.
// Run against a fresh bench: node src/bench/budgets.browser.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { chromium } from "playwright";

const shots = process.argv[2];
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
const base = `http://localhost:${process.env.BENCH_PORT ?? 3000}`;
page.on("pageerror", (e) => errors.push(e.message));
let government = null;
let budget = null;
page.on("response", async (r) => {
  const path = new URL(r.url()).pathname;
  if (path === "/api/government")
    government = await r.json().catch(() => government);
  if (path === "/api/budget") budget = await r.json().catch(() => budget);
});
const politicsTabs = async () => {
  government = null;
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-body .split-screen").waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll("#sheet-tabs button").length > 0,
  );
  return page.locator("#sheet-tabs button").allInnerTexts();
};
const hasBudgets = (tabs) => tabs.some((t) => /^budgets$/i.test(t.trim()));
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  const made = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/newlife",
    { timeout: 600000 },
  );
  await page.locator("#new-life").click();
  // The world modes sit under Advanced once New game puts Start a life first.
  if (await page.locator("#new-advanced").isVisible())
    await page.locator("#new-advanced").click();
  await page.locator("#new-world").click();
  const asked = new URL((await made).url()).searchParams;
  const world = { seed: asked.get("seed"), date: asked.get("date") };
  console.log("Seed:", world.seed);
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());

  // At 17: no office, no filing, not of age to vote, and no Budgets tab.
  const young = await politicsTabs();
  assert.ok(government, "the government view did not load");
  assert.equal(government.ofVotingAge, false, "the new life is of voting age");
  assert.equal(government.filings.length, 0, "the new life has a filing");
  assert.ok(!hasBudgets(young), `Budgets shows at 17: ${young.join(", ")}`);
  console.log("PASS at 17 Politics offers", young.join(", "));
  if (shots) await page.screenshot({ path: `${shots}/before-at-17.png` });
  await page.keyboard.press("Escape");

  // A grown resident of the same world files at the counter.
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
  await page
    .locator('[data-tab="travel"]')
    .first()
    .evaluate((e) => e.click());
  const go = page.locator("#sheet-body .entry", { hasText: /You file here/ });
  await go.first().waitFor();
  let atCounter = false;
  for (let i = 0; i < (await go.count()) && !atCounter; i++) {
    await go.nth(i).click();
    const placeGo = page.locator('[data-testid="place-go"]');
    if (await placeGo.isVisible().catch(() => false)) await placeGo.click();
    atCounter = await page
      .locator("#talk:not([hidden])")
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
  }
  assert.ok(atCounter, "no place in Travel takes filings");
  // The narrator sets the counter up first, alone; Continue, then the clerk.
  const next = page.locator("#talk-next");
  if (await next.isVisible().catch(() => false)) await next.click();
  await page.locator("#talk-choices button").first().click();
  await page
    .locator("#talk-choices button", { hasText: /file for this office/i })
    .first()
    .waitFor();
  const filed = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/filing/choose",
  );
  await page
    .locator("#talk-choices button", { hasText: /file for this office/i })
    .first()
    .click();
  const result = (await (await filed).json()).result;
  assert.ok(
    ["petitioning", "on-ballot"].includes(result?.filing?.status),
    `the filing was refused: ${JSON.stringify(result?.unmet ?? result)}`,
  );
  await page
    .locator("#talk-leave")
    .click()
    .catch(() => {});

  // Filed: the tab is there, and every sum reads in a rounded unit.
  const grown = await politicsTabs();
  assert.ok(government.filings.length > 0, "the filing is not on record");
  assert.ok(hasBudgets(grown), `no Budgets after filing: ${grown.join(", ")}`);
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: /^budgets$/i })
    .click();
  await page.locator(".budget-screen .donut-share").first().waitFor();
  // Budgets opens on the town's own books: its city government, or the county
  // that serves it where the place has no city, never the federal default.
  assert.ok(budget, "the budget view did not load");
  const local = ["city", "county"]
    .map((level) =>
      budget.governments.find((g) => g.level === level && g.latest),
    )
    .find(Boolean);
  const levels = budget.governments.map((g) => g.level).join(", ");
  assert.ok(local, `no local budget to open on: ${levels}`);
  assert.equal(
    await page.locator("#sheet-body select").evaluate((e) => e.value),
    local.id,
    `Budgets did not open on the local books (${local.level}) of ${levels}`,
  );
  console.log(`PASS Budgets opens on the ${local.level} books of ${levels}`);
  // Every amount on the rings, in their keys and in the books.
  const sums = await page
    .locator(
      ".budget-screen .donut-total, .budget-screen .donut-share, .budget-screen .record-value, .budget-screen .record-chart-line strong",
    )
    .allInnerTexts();
  assert.ok(sums.length > 3, "the budget shows no sums");
  for (const sum of sums)
    assert.match(
      sum.trim(),
      /^−?\$(\d{1,3}(,\d{3})*|\d+(\.\d)? (million|billion|trillion))$/,
      `a budget sum is not rounded: ${sum}`,
    );
  console.log("PASS after filing Politics offers", grown.join(", "));
  console.log("Sums:", sums.slice(0, 3).join(" · "));
  if (shots) await page.screenshot({ path: `${shots}/after-filing.png` });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
