/* global process, URL, console, document, NodeFilter */
// Every sheet of a new game, at the start and after a day, prints no raw
// record id and no missing value ("undefined", "NaN").
import assert from "node:assert/strict";
import { chromium } from "playwright";
const RECORD_ID =
  /\b(?:[a-z][a-z-]*_[0-9a-f]{8,}|[a-z][a-z-]*(?::[A-Za-z0-9._@-]+){2,})\b/;
const MISSING = /\b(?:undefined|NaN|null)\b/;
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const bad = [];
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
  console.log(
    "Player:",
    await page.locator("#card-name").innerText(),
    "Place:",
    await page.locator("#card-place").innerText(),
  );
  // The rail's icons, then what the portrait and Esc open (the shell's other doors).
  const tabs = [
    ...(await page
      .locator(".ring[data-tab]")
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab))),
    "you",
    "work and study",
    "options",
    "guide",
  ];
  const closeAny = async () => {
    if (await page.locator("#sheet").isVisible())
      await page.locator("#sheet-close").click();
  };
  const openDoor = async (tab) => {
    await closeAny();
    if (tab === "you" || tab === "work and study")
      await page.locator("#card-bust").click();
    else if (tab === "options" || tab === "guide")
      await page.keyboard.press("Escape");
    else
      await page
        .locator(`.ring[data-tab="${tab}"]`)
        .first()
        .evaluate((e) => e.click());
    if (tab === "work and study")
      await page
        .locator("#sheet-tabs .tab", { hasText: "Work and study" })
        .click();
    if (tab === "guide")
      await page.locator("#sheet-tabs .tab", { hasText: "Guide" }).click();
  };
  const scan = async (when) => {
    for (const tab of tabs) {
      await openDoor(tab);
      await page.waitForTimeout(1500);
      // Only what a reader can see: hidden lines don't count.
      const text = await page.locator("#sheet").evaluate((sheet) => {
        const out = [];
        const walk = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode())
          if (n.parentElement?.checkVisibility?.() !== false)
            out.push(n.textContent);
        return out.join("\n");
      });
      for (const line of text.split("\n"))
        if (RECORD_ID.test(line) || MISSING.test(line))
          bad.push(`${when} · ${tab}: ${line.trim().slice(0, 160)}`);
      await page.keyboard.press("Escape");
    }
  };
  await scan("start");
  await page.locator("#day").click();
  await page.waitForFunction(() => !document.getElementById("day").disabled);
  await scan("after a day");
  console.log(bad.length ? bad.join("\n") : "no raw ids or missing values");
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  console.log(`PASS ${tabs.length} sheets, twice`);
} finally {
  await browser.close();
}
