/* global document, console, URL, process */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
await page.route("**/api/controls", async (route) => {
  const response = await route.fetch();
  const data = await response.json();
  const { readFile } = await import("node:fs/promises");
  await route.fulfill({
    json: {
      ...data,
      ...JSON.parse(await readFile("src/bench/data/controls.json", "utf8")),
    },
  });
});
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGE ERROR", e.message);
});
try {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto("http://localhost:3000/play");
  await ready;
  if (await page.locator("#front-continue").isEnabled()) {
    await page.locator("#front-continue").click();
  } else {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/newlife",
      { timeout: 300000 },
    );
    await page.locator("#new-life").click();
    await page.locator("#new-world").click();
    const r = await response;
    assert.equal(r.status(), 200);
    console.log("Seed:", new URL(r.url()).searchParams.get("seed"));
    await page
      .locator("#opening-box:not([hidden])")
      .waitFor({ timeout: 120000 });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Skip opening", exact: true })
      .click();
  }
  await page.waitForFunction(
    () =>
      document.getElementById("card-name").textContent.trim() &&
      document.getElementById("card-clock").textContent.trim(),
  );
  const name = await page.locator("#card-name").innerText();
  const clock = await page.locator("#card-clock").innerText();
  console.log(
    "Player:",
    name,
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  await page
    .locator('[data-tab="jobs"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".work-overview").waitFor();
  assert.equal(await page.locator(".study-overview").count(), 1);
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/reports/jobs-study-layout/jobs.png" });
  const rejected = await page.request.post(
    "http://localhost:3000/api/jobs/answer?offerId=not-an-offer&answer=accept",
  );
  assert.ok(!rejected.ok());
  let offers = [
    {
      id: "ui-offer",
      title: "Clerk",
      employer: "Recorded workplace",
      hourlyMinor: 1800,
      deadline: "2025-02-01",
    },
  ];
  const answers = [];
  await page.route("**/api/jobs?*", (route) =>
    route.fulfill({ json: { offers } }),
  );
  await page.route("**/api/jobs/answer?*", (route) => {
    answers.push(new URL(route.request().url()).searchParams.get("answer"));
    offers = [];
    return route.fulfill({ json: { answered: true } });
  });
  await page
    .locator('[data-tab="jobs"]')
    .first()
    .evaluate((e) => e.click());
  await page.getByRole("button", { name: "Take it", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".job-offer"));
  assert.deepEqual(answers, ["accept"]);
  offers = [
    {
      id: "ui-offer-2",
      title: "Clerk",
      employer: "Recorded workplace",
      hourlyMinor: 1800,
      deadline: "2025-02-01",
    },
  ];
  await page
    .locator('[data-tab="jobs"]')
    .first()
    .evaluate((e) => e.click());
  await page.getByRole("button", { name: "Turn it down", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".job-offer"));
  assert.deepEqual(answers, ["accept", "decline"]);
  assert.deepEqual(errors, []);
  console.log(
    "PASS generated work/school browsing, invalid-offer guard, accept/decline UI request contracts",
  );
} finally {
  await browser.close();
}
