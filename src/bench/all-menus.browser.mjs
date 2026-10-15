/* global document, console, URL, getComputedStyle */
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
page.setDefaultTimeout(30000);
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
  const screens = {
    calendar: ".calendar-layout",
    people: ".relationship-web",
    politics: ".government-content",
    news: ".paper",
    journal: "#sheet-body",
    who: ".character-heading",
    money: ".cash-total",
    jobs: ".work-overview",
    travel: ".travel-destinations",
    guide: 'input[type="search"]',
    options: ".options-actions",
  };
  for (const [tab, selector] of Object.entries(screens)) {
    await page
      .locator(`[data-tab="${tab}"]`)
      .first()
      .evaluate((e) => e.click());
    await page
      .locator(selector === "#sheet-body" ? selector : `#sheet ${selector}`)
      .first()
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(
      !(await page.locator("#sheet-body").innerText()).includes("undefined"),
      tab,
    );
    assert.equal(await page.locator("#card-clock").innerText(), clock, tab);
    await page.screenshot({
      path: `docs/reports/all-menus-2026-10-15/${tab}.png`,
    });
    const outside = await page.locator("#sheet-body").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [...el.querySelectorAll("button,input,select")]
        .filter(
          (e) =>
            !e.hidden &&
            e.offsetParent &&
            getComputedStyle(e).visibility !== "hidden",
        )
        .filter((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 0 && (b.right > r.right + 3 || b.left < r.left - 3);
        })
        .map((e) => e.textContent || e.getAttribute("aria-label"));
    });
    assert.deepEqual(outside, [], `${tab} horizontal clipping`);
  }
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".government-content").waitFor();
  for (const tab of ["Campaigns", "Parties", "Issues", "Budgets"]) {
    const endpoint = {
      Campaigns: "/api/results",
      Parties: "/api/government",
      Issues: "/api/changes",
      Budgets: "/api/budget",
    }[tab];
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === endpoint,
    );
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await response;
    await page.waitForTimeout(100);
    assert.ok(
      !(await page.locator("#sheet-body").innerText()).includes("undefined"),
    );
    assert.equal(await page.locator("#card-clock").innerText(), clock);
    await page.screenshot({
      path: `docs/reports/all-menus-2026-10-15/${tab.toLowerCase()}.png`,
    });
  }
  await page
    .locator('[data-tab="people"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".people-node").first().click();
  await page.getByRole("button", { name: "View person", exact: true }).click();
  await page.locator("#person:not([hidden])").waitFor();
  await page.screenshot({
    path: "docs/reports/all-menus-2026-10-15/person.png",
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const tab of [
    "calendar",
    "people",
    "politics",
    "news",
    "who",
    "money",
    "jobs",
    "travel",
  ]) {
    await page
      .locator(`[data-tab="${tab}"]`)
      .first()
      .evaluate((e) => e.click());
    await page.locator(`#sheet ${screens[tab]}`).first().waitFor();
    const box = await page.locator("#sheet").boundingBox();
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= 1024 &&
        box.y + box.height <= 768,
      tab,
    );
    await page.screenshot({
      path: `docs/reports/all-menus-2026-10-15/${tab}-small.png`,
    });
  }
  await page
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".government-content").waitFor();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.locator(".gov-map").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS all menus together, preserved clock, large-person card, no horizontal clipped controls, smaller panels",
  );
} finally {
  await browser.close();
}
