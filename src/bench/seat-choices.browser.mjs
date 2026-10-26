/* global process, console, document, URL */
// At a filing counter with several races, each choice names its seat, its
// election day and who holds the seat now, before the player picks: a drawn
// place, every counter Travel lists, until one offers two races or more.
// Run against a fresh bench: node src/bench/seat-choices.browser.mjs [screenshot-dir]
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
const dateWords =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/;
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

  // Every counter Travel lists, until one offers several races.
  const travel = async () => {
    await page
      .locator('[data-tab="travel"]')
      .first()
      .evaluate((e) => e.click());
    const go = page.locator("#sheet-body button", { hasText: /Go/ });
    await go.first().waitFor();
    return go;
  };
  let picks = [];
  let office = "";
  const tried = [];
  for (let i = 0; ; i++) {
    const go = await travel();
    if (i >= (await go.count())) break;
    const label = (await go.nth(i).getAttribute("aria-label")) ?? "";
    await go.nth(i).click();
    const atCounter = await page
      .locator("#talk:not([hidden])")
      .waitFor({ timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!atCounter) {
      await page.keyboard.press("Escape").catch(() => {});
      continue;
    }
    // The choices that name an office: every one but leaving.
    picks = await page.locator("#talk-choices button").evaluateAll((buttons) =>
      buttons.map((b) => ({
        text: b.childNodes[0]?.textContent?.trim() ?? "",
        facts: b.querySelector(".reply-facts")?.textContent?.trim() ?? "",
      })),
    );
    tried.push(`${label}: ${picks.length}`);
    if (picks.length >= 2) {
      office = label;
      break;
    }
    await page.locator("#talk-leave").click();
    await page.locator("#talk").waitFor({ state: "hidden" });
  }
  assert.ok(
    picks.length >= 2,
    `no counter here offers two races: ${tried.join("; ")}`,
  );
  console.log("Office:", office);
  if (shots)
    await page.screenshot({
      path: `${shots}/${process.env.SHOT_NAME ?? "after"}-counter.png`,
    });
  for (const pick of picks) {
    console.log(`  ${pick.text} — ${pick.facts}`);
    assert.ok(pick.facts, `"${pick.text}" names no seat, date or holder`);
    assert.match(pick.facts, dateWords, `"${pick.text}" names no election day`);
    assert.ok(
      pick.facts.includes(controls.filing.heldBy) ||
        pick.facts.includes(controls.filing.openSeat),
      `"${pick.text}" does not say who holds the seat`,
    );
  }
  const told = picks.map((p) => `${p.text} ${p.facts}`);
  assert.equal(
    new Set(told).size,
    told.length,
    `two choices read the same: ${told.join(" | ")}`,
  );
  assert.deepEqual(errors, []);
  console.log("PASS every race at the counter names its seat, day and holder");
} finally {
  await browser.close();
}
