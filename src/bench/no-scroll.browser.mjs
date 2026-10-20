/* global process, URL, console, document */
// Every sheet of a new game, at the start and after a day, fits its window:
// its body and the page overflow by no more than 8 pixels (owner, M6-02: main
// screens do not scroll).
import assert from "node:assert/strict";
import { chromium } from "playwright";
const SLACK = 8;
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
  const tabs = await page
    .locator(".nav-item[data-tab]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.tab));
  const scan = async (when) => {
    for (const tab of tabs) {
      await page
        .locator(`.nav-item[data-tab="${tab}"]`)
        .first()
        .evaluate((e) => e.click());
      await page.waitForTimeout(1500);
      // The sheet's own scroll box and the page: how far each holds more than it shows.
      const over = await page.evaluate(() => {
        const sheet = document.getElementById("sheet");
        const body = document.scrollingElement;
        // Every box in the sheet that scrolls, and how far its content passes it.
        let worst = {
          px: sheet.scrollHeight - sheet.clientHeight,
          where: "#sheet",
        };
        for (const node of sheet.querySelectorAll("*")) {
          const y = getComputedStyle(node).overflowY;
          if (y === "visible") continue;
          if (node.checkVisibility?.() === false) continue;
          const px = node.scrollHeight - node.clientHeight;
          if (px > worst.px)
            worst = {
              px,
              where: `${node.tagName.toLowerCase()}.${node.className}`,
            };
        }
        return {
          sheet: worst.px,
          where: worst.where,
          page: body.scrollHeight - body.clientHeight,
        };
      });
      console.log(
        `${when} · ${tab}: ${over.where} ${over.sheet}px, page ${over.page}px`,
      );
      if (over.sheet > SLACK || over.page > SLACK)
        bad.push(
          `${when} · ${tab}: ${over.where} over by ${over.sheet}px, page by ${over.page}px`,
        );
      // Whatever the sheet holds is still reachable: the pager's pages together show every row.
      if (await page.locator("#sheet-pager").isVisible()) {
        const rowsOf = () =>
          page.evaluate(() =>
            [
              ...document.querySelectorAll(
                "#sheet-body > *:not(.flow), #sheet-body > .flow > *",
              ),
            ].map((row) => !row.classList.contains("paged-out")),
          );
        const first = await rowsOf();
        const seen = first.map((shown) => shown);
        let pages = 1;
        const next = page.locator("#sheet-pager button").nth(1);
        while ((await next.isVisible()) && pages < 60) {
          await next.click();
          (await rowsOf()).forEach((shown, i) => {
            if (shown) seen[i] = true;
          });
          pages += 1;
        }
        console.log(`${when} · ${tab}: ${pages} pages`);
        // A sideways (column) sheet shows all its rows on every page; a list shows each once.
        if (seen.some((shown) => !shown))
          bad.push(`${when} · ${tab}: some rows are on no page`);
      }
      await page.keyboard.press("Escape");
    }
  };
  await scan("start");
  await page.locator("#day").click();
  await page.waitForFunction(() => !document.getElementById("day").disabled);
  await scan("after a day");
  console.log(bad.length ? bad.join("\n") : "no sheet scrolls");
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  console.log(`PASS ${tabs.length} sheets, twice`);
} finally {
  await browser.close();
}
