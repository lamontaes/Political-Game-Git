/* global process, console, document, URL, URLSearchParams */
// Politics → Issues names each rate by the government that sets it and shows
// no rate a level does not levy: a state with no income tax shows none, and
// a level-free name heads each law. A drawn place by default; PLACE_KEY
// opens a named locality for a screenshot.
// Run against a fresh bench: node src/bench/issues-levels.browser.mjs [screenshot-dir]
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
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`);
  await ready;
  if (process.env.PLACE_KEY) {
    const made = await page.request.post(
      `${base}/api/newlife?${new URLSearchParams({ seed: "issues-levels", placeKey: process.env.PLACE_KEY })}`,
      { timeout: 600000 },
    );
    assert.equal(made.status(), 200, await made.text());
    await page.reload();
    await page.locator("#front-continue").click();
  } else {
    const made = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 600000 },
    );
    await page.locator("#new-life").click();
    // The world modes sit under Advanced once New game puts Start a life first.
    if (await page.locator("#new-advanced").isVisible())
      await page.locator("#new-advanced").click();
    await page.locator("#new-world").click();
    console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
    await page
      .locator("#opening-box:not([hidden])")
      .waitFor({ timeout: 300000 });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Skip opening", exact: true })
      .click();
  }
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  const id = (await (await page.request.get(`${base}/api/title`)).json()).life
    .personId;
  const { law } = await (
    await page.request.get(
      `${base}/api/government?id=${encodeURIComponent(id)}`,
    )
  ).json();

  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-tabs button").first().waitFor();
  await page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Issues", exact: true })
    .click();
  await page.locator(".law-card").first().waitFor();
  if (shots)
    await page.screenshot({
      path: `${shots}/${process.env.SHOT_NAME ?? "after"}-issues.png`,
    });
  // Every card on every page, by its heading.
  const cards = new Map();
  for (let p = 0; p < 10; p++) {
    for (const card of await page.locator(".law-card summary").all()) {
      const name = await card.locator("h3").innerText();
      cards.set(
        name.toLowerCase(),
        await card.locator(".law-value").innerText(),
      );
    }
    const next = page.locator(".issues-content .record-pager button").nth(1);
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
  }
  assert.ok(cards.size >= 3, "Issues shows no laws");
  for (const [name] of cards)
    assert.doesNotMatch(name, /^local /, `"${name}" names one level`);

  // Each card: the levels that levy a rate, by their government, and no other.
  const income = law.find((row) => row.series === "income-tax");
  assert.ok(income, "no income tax record");
  const controls = await (
    await page.request.get(`${base}/api/controls`)
  ).json();
  const heading = (series) =>
    (
      controls.politics.seriesNames?.[series] ??
      controls.policyNames?.[series] ??
      series.replace(/-/g, " ")
    ).toLowerCase();
  for (const row of law) {
    const levied = row.levels.filter((l) => l.row && l.row.value);
    const quiet = row.levels.filter((l) => l.row && !l.row.value);
    const text = cards.get(heading(row.series));
    // A stand-in row from another series (a state's average local sales tax
    // where the town records none) says what it is instead of a government.
    for (const level of levied)
      assert.ok(
        level.government || level.row.series !== row.series,
        `${row.series}: ${level.level} has no name`,
      );
    if (!levied.length) continue;
    assert.ok(
      text,
      `${row.series}: no card names ${levied.map((l) => l.government).join(", ")}`,
    );
    for (const level of quiet)
      if (
        level.government &&
        !levied.some((l) => l.government === level.government)
      )
        assert.ok(
          !text.includes(level.government),
          `${row.series}: ${level.government} levies none but is shown: ${text}`,
        );
    console.log(`  ${row.series}: ${text}`);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS every rate on Issues names who sets it, and none is shown for a level that levies none",
  );
} finally {
  await browser.close();
}
