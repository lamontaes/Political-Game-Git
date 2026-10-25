/* global process, console, document, URL */
// Politics has its own Guide: a page for each of Government, Issues, Parties
// and Campaigns saying what it is for, then how the player could run here,
// naming the place's own filing office and filing dates from the records.
// Run against a fresh bench: node src/bench/politics-guide.browser.mjs [screenshot-dir]
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
const words = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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
  console.log("Seed:", new URL((await made).url()).searchParams.get("seed"));
  await page.locator("#opening-box:not([hidden])").waitFor({ timeout: 300000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Skip opening", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("card-name").textContent.trim(),
  );
  console.log("Place:", await page.locator("#card-place").innerText());
  const controls = await (
    await page.request.get(`${base}/api/controls`)
  ).json();
  const labels = controls.politics.guide;
  assert.ok(labels, "the guide's labels are not in the controls data");

  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator("#sheet-tabs button").first().waitFor();
  const guide = page
    .locator("#sheet-tabs")
    .getByRole("button", { name: "Guide", exact: true });
  assert.equal(
    await guide.count(),
    1,
    `Politics has no Guide control: ${(await page.locator("#sheet-tabs button").allInnerTexts()).join(", ")}`,
  );
  await guide.click();
  await page.locator(".politics-guide-page").waitFor();

  // One page per tab, each its purpose in a line, in order.
  const next = page.locator(".politics-guide .record-pager button").nth(1);
  for (const [tab, title] of [
    ["government", "Government"],
    ["issues", "Issues"],
    ["parties", "Parties"],
    ["campaigns", "Campaigns"],
  ]) {
    const text = await page.locator(".politics-guide-page").innerText();
    assert.ok(
      text.toLowerCase().includes(title.toLowerCase()),
      `the ${tab} page is not headed ${title}`,
    );
    assert.ok(text.includes(labels[tab]), `the ${tab} page has no purpose`);
    console.log(`  ${title}: ${labels[tab]}`);
    if (shots) await page.screenshot({ path: `${shots}/guide-${tab}.png` });
    await next.click();
  }

  // How to run here: the race, the office that takes it and its dates, from
  // the records, in words.
  const { nextFiling } = await (
    await page.request.get(
      `${base}/api/government?id=${encodeURIComponent(
        (await (await page.request.get(`${base}/api/title`)).json()).life
          .personId,
      )}`,
    )
  ).json();
  const run = await page.locator(".politics-guide-page").innerText();
  const lower = run.toLowerCase();
  assert.ok(
    lower.includes(labels.runHere.toLowerCase()),
    "no page on running here",
  );
  assert.ok(nextFiling, "no race on record to file for");
  for (const [label, value] of [
    [labels.race, nextFiling.title],
    [labels.filesWith, nextFiling.filedWith],
    [labels.filingOpens, words(nextFiling.filingOpens)],
    [labels.filingDeadline, words(nextFiling.filingDeadline)],
    [labels.election, words(nextFiling.electionDate)],
  ]) {
    // Labels are set in capitals by the style; compare the words.
    assert.ok(lower.includes(label.toLowerCase()), `no ${label} line`);
    assert.ok(
      lower.includes(value.toLowerCase()),
      `${label} does not read ${value}`,
    );
  }
  assert.doesNotMatch(run, /\b\d{4}-\d{2}-\d{2}\b/, "a date reads as a code");
  console.log(
    `  Run here: ${nextFiling.title} · ${nextFiling.filedWith} · deadline ${words(nextFiling.filingDeadline)}`,
  );
  if (shots) await page.screenshot({ path: `${shots}/guide-run-here.png` });
  assert.equal(await next.isDisabled(), true, "the guide runs past its end");
  assert.deepEqual(errors, []);
  console.log("PASS Politics guide: four tabs and how to run here");
} finally {
  await browser.close();
}
