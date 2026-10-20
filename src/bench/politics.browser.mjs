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
let government = null;
page.on("response", async (r) => {
  if (new URL(r.url()).pathname === "/api/government")
    government = await r.json().catch(() => government);
});
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
    .locator('[data-tab="politics"]')
    .first()
    .evaluate((e) => e.click());
  await page.locator(".government-content").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Your office", exact: true })
      .count(),
    0,
  );
  for (const level of ["state", "federal", "local"])
    await page.locator(`[data-level="${level}"]`).click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/reports/politics-hub-2026-10-14/government.png",
  });
  // Politics shows the service years and the election that seated an official,
  // named by the term record (the Politics sheet reads `townSeats` and `pastElections`).
  await page.locator('[data-level="local"]').click();
  assert.ok(government, "the Politics sheet read the government view");
  const view = government;
  const levelOf = (seat) =>
    ["state", "federal"].includes(seat.level) ? seat.level : "local";
  let checked = 0;
  for (const level of ["local", "state", "federal"]) {
    // The first member listed on the level's first body is on its first page.
    const first = view.seats.find((seat) => levelOf(seat) === level);
    const won = first?.holder
      ? first.elections.find((e) => e.termId === first.holder.termId)
      : undefined;
    if (!won) continue;
    await page.locator(`[data-level="${level}"]`).click();
    const shown = await page.locator(".government-content").innerText();
    assert.equal(
      await page
        .locator(`.government-content [data-election="${won.termId}"]`)
        .count(),
      1,
      `Politics (${level}) reads the election term ${won.termId}`,
    );
    assert.ok(
      !shown.includes("term:seat:"),
      `Politics (${level}) shows no raw term id`,
    );
    assert.ok(
      shown.includes(first.holder.serviceStart),
      `Politics (${level}) shows the service start ${first.holder.serviceStart}`,
    );
    console.log(
      "History on screen:",
      level,
      won.termId,
      first.holder.serviceStart,
    );
    checked += 1;
  }
  assert.ok(checked > 0, "at least one level shows a holder's election");
  await page.locator('[data-level="state"]').click();
  // The state filter: switch to another state and its legislators are listed.
  await page.locator('[data-level="state"]').click();
  const picker = page.locator(".government-state");
  const options = await picker
    .locator("option")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({ value: node.value, label: node.textContent })),
    );
  assert.ok(options.length > 50, "every state is on the list");
  const own = await page.locator(".government-content").innerText();
  const pick = options.find((option) => option.value && option.value !== "");
  await picker.selectOption(pick.value);
  await page.waitForFunction(
    (before) =>
      document.querySelector(".government-content")?.innerText !== before,
    own,
  );
  const other = await page.locator(".government-content").innerText();
  assert.ok(
    (await page.locator(".government-content .government-body").count()) > 0,
    `${pick.label} lists its chambers`,
  );
  assert.notEqual(other, own, "another state lists its own members");
  await page.screenshot({
    path: "docs/reports/politics-hub-2026-10-14/state-switched.png",
  });
  await picker.selectOption("");
  await page.locator('[data-level="local"]').click();
  for (const tab of ["Campaigns", "Parties", "Issues", "Budgets"]) {
    await page
      .locator("#sheet-tabs")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await page.waitForTimeout(250);
    assert.ok(
      !(await page.locator("#sheet-body").innerText()).includes("undefined"),
    );
    if (tab === "Issues") {
      await page.locator(".law-card summary").first().click();
      assert.equal(await page.locator(".law-card[open]").count(), 1);
    }
    await page.screenshot({
      path: `docs/reports/politics-hub-2026-10-14/${tab.toLowerCase()}.png`,
    });
  }
  assert.equal(await page.locator("#card-clock").innerText(), clock);
  assert.deepEqual(errors, []);
  console.log(
    "PASS government filters, conditional office, every politics tab, law details and unchanged clock",
  );
} finally {
  await browser.close();
}
